import { useCallback, useEffect, useRef, useState } from "react";
import {
	Dimensions,
	type FlatList as FlatListType,
	type ViewToken,
} from "react-native";

import {
	addLocalDays,
	isSameLocalDay,
	startOfLocalWeek,
	toLocalDateString,
} from "@/lib/date/calendar-date";
import { formatMonthYear } from "@/lib/date/format-date";
import { generateWeeks, type WeekData } from "@/utils/horizontal-calendar";

const INITIAL_WEEKS_COUNT = 104;
const LOAD_MORE_WEEKS_COUNT = 10;
const PREPEND_LOAD_THRESHOLD = 3;
const APPEND_LOAD_THRESHOLD = 4;
const PREPEND_LOOKBACK_WEEKS = 5;
const STRIP_HORIZONTAL_MARGIN = 32;
const DAY_PILL_GUTTER = 16;
const DAYS_PER_WEEK = 7;
const VIEWABILITY_MIN_VIEW_TIME_MS = 100;
const VIEWABILITY_THRESHOLD_PERCENT = 50;

export const CALENDAR_STRIP_VIEWABILITY_CONFIG = {
	itemVisiblePercentThreshold: VIEWABILITY_THRESHOLD_PERCENT,
	minimumViewTime: VIEWABILITY_MIN_VIEW_TIME_MS,
} as const;

function weeksNotInList(
	existing: WeekData[],
	candidates: WeekData[]
): WeekData[] {
	const existingIds = new Set(existing.map((week) => week.id));
	return candidates.filter((week) => !existingIds.has(week.id));
}

/** Ten more weeks before the list's first, deduped; `[]` when there is nothing to add. */
function weeksBefore(weeks: WeekData[]): WeekData[] {
	const firstWeek = weeks[0]?.weekStart;
	if (!firstWeek) {
		return [];
	}
	const earlier = generateWeeks(
		addLocalDays(firstWeek, -PREPEND_LOOKBACK_WEEKS * DAYS_PER_WEEK),
		LOAD_MORE_WEEKS_COUNT
	);
	return weeksNotInList(weeks, earlier);
}

/** Ten more weeks after the list's last, deduped; `[]` when there is nothing to add. */
function weeksAfter(weeks: WeekData[]): WeekData[] {
	const lastWeek = weeks.at(-1)?.weekStart;
	if (!lastWeek) {
		return [];
	}
	const later = generateWeeks(
		addLocalDays(lastWeek, DAYS_PER_WEEK),
		LOAD_MORE_WEEKS_COUNT
	);
	return weeksNotInList(weeks, later);
}

/** Grows the list in whichever direction the viewport is approaching. */
function extendedWeeks(
	weeks: WeekData[],
	firstVisibleIndex: number
): WeekData[] {
	if (firstVisibleIndex < PREPEND_LOAD_THRESHOLD) {
		const toPrepend = weeksBefore(weeks);
		return toPrepend.length > 0 ? [...toPrepend, ...weeks] : weeks;
	}
	if (firstVisibleIndex > weeks.length - APPEND_LOAD_THRESHOLD) {
		const toAppend = weeksAfter(weeks);
		return toAppend.length > 0 ? [...weeks, ...toAppend] : weeks;
	}
	return weeks;
}

function findWeekIndex(weeks: WeekData[], date: Date): number {
	const weekStart = startOfLocalWeek(date);
	return weeks.findIndex((week) => isSameLocalDay(week.weekStart, weekStart));
}

export interface UseCalendarStripParams {
	onDateSelect: (date: Date) => void;
	selectedDate: Date;
}

/**
 * State and behaviour for the horizontal calendar strip: the week list, scroll
 * position, infinite load in both directions, and day selection.
 *
 * Weeks are local calendar weeks starting on Sunday — the strip has to line up
 * with the device's own idea of "today", which is the same reason the
 * consumption date is derived locally.
 */
export function useCalendarStrip({
	selectedDate,
	onDateSelect,
}: Readonly<UseCalendarStripParams>) {
	const today = new Date();
	const todayWeekStart = startOfLocalWeek(today);

	const initialWeeks = generateWeeks(todayWeekStart, INITIAL_WEEKS_COUNT);
	const todayWeekIndex = initialWeeks.findIndex((week) =>
		isSameLocalDay(week.weekStart, todayWeekStart)
	);
	const initialVisibleIndex =
		todayWeekIndex >= 0 ? todayWeekIndex : Math.floor(initialWeeks.length / 2);

	const [weeks, setWeeks] = useState<WeekData[]>(initialWeeks);
	const [visibleWeekIndex, setVisibleWeekIndex] = useState(initialVisibleIndex);
	const flatListRef = useRef<FlatListType<WeekData>>(null);

	const screenWidth = Dimensions.get("window").width;
	const weekWidth = screenWidth - STRIP_HORIZONTAL_MARGIN;
	const dayPillWidth = (weekWidth - DAY_PILL_GUTTER) / DAYS_PER_WEEK;

	const visibleWeekStart = weeks[visibleWeekIndex]?.weekStart ?? todayWeekStart;
	const isCurrentWeek = isSameLocalDay(visibleWeekStart, todayWeekStart);
	const monthLabel = formatMonthYear(visibleWeekStart);

	const getItemLayout = useCallback(
		(_: unknown, index: number) => ({
			length: weekWidth,
			offset: weekWidth * index,
			index,
		}),
		[weekWidth]
	);

	const scrollToWeekIndex = useCallback(
		(index: number, animated = true) => {
			if (index >= 0 && index < weeks.length) {
				flatListRef.current?.scrollToIndex({
					index,
					animated,
					viewPosition: 0.5,
				});
				setVisibleWeekIndex(index);
			}
		},
		[weeks.length]
	);

	const jumpToToday = useCallback(() => {
		const weekIndex = findWeekIndex(weeks, today);
		if (weekIndex >= 0) {
			scrollToWeekIndex(weekIndex);
		}
		onDateSelect(today);
	}, [today, onDateSelect, weeks, scrollToWeekIndex]);

	const handleDayPress = useCallback(
		(date: Date) => {
			onDateSelect(date);
			const weekIndex = findWeekIndex(weeks, date);
			if (weekIndex >= 0) {
				scrollToWeekIndex(weekIndex);
			}
		},
		[onDateSelect, weeks, scrollToWeekIndex]
	);

	// Sync the visible week when `selectedDate` changes externally (e.g. a fling
	// gesture). Guarded by `prevSyncedDateRef` so the strip's own scrolling and
	// its infinite-load prepend/append cannot snap the user back.
	const prevSyncedDateRef = useRef(toLocalDateString(selectedDate));
	useEffect(() => {
		const dateKey = toLocalDateString(selectedDate);
		if (dateKey === prevSyncedDateRef.current) {
			return;
		}
		prevSyncedDateRef.current = dateKey;

		const weekIndex = findWeekIndex(weeks, selectedDate);
		if (weekIndex >= 0) {
			scrollToWeekIndex(weekIndex);
		}
	}, [selectedDate, weeks, scrollToWeekIndex]);

	const extendWeeks = useCallback((firstVisibleIndex: number) => {
		setWeeks((previous) => extendedWeeks(previous, firstVisibleIndex));
	}, []);

	const handleViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: ViewToken[] }) => {
			const first = viewableItems[0];
			if (!first || first.index === null) {
				return;
			}
			setVisibleWeekIndex(first.index);
			extendWeeks(first.index);
		},
		[extendWeeks]
	);

	return {
		flatListRef,
		weeks,
		weekWidth,
		dayPillWidth,
		initialVisibleIndex,
		monthLabel,
		isCurrentWeek,
		jumpToToday,
		getItemLayout,
		handleDayPress,
		handleViewableItemsChanged,
	};
}
