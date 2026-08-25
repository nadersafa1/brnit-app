import {
	addLocalDays,
	LOCAL_DAYS_PER_WEEK,
	startOfLocalWeek,
	toLocalDateString,
} from "@/lib/date/calendar-date";

/** One row of the horizontal calendar strip: the Sunday its week starts on. */
export interface WeekData {
	/** `'YYYY-MM-DD'` of `weekStart`; stable list key and identity for dedupe. */
	id: string;
	/** Local midnight of the Sunday. */
	weekStart: Date;
}

function toWeekData(weekStart: Date): WeekData {
	return { id: toLocalDateString(weekStart), weekStart };
}

/**
 * `count` consecutive weeks centred on `centerWeek`, ascending.
 *
 * Weeks are stepped in whole local days rather than by adding milliseconds, so
 * a DST changeover cannot slide a row onto the wrong Sunday.
 */
export function generateWeeks(centerWeek: Date, count: number): WeekData[] {
	const halfCount = Math.floor(count / 2);
	const startWeek = addLocalDays(
		startOfLocalWeek(centerWeek),
		-halfCount * LOCAL_DAYS_PER_WEEK
	);

	const weeks: WeekData[] = [];
	for (let index = 0; index < count; index += 1) {
		weeks.push(toWeekData(addLocalDays(startWeek, index * LOCAL_DAYS_PER_WEEK)));
	}
	return weeks;
}

/** The seven days of `weekStart`'s week, ascending, at local midnight. */
export function expandWeekDays(weekStart: Date): Date[] {
	return Array.from({ length: LOCAL_DAYS_PER_WEEK }, (_, index) =>
		addLocalDays(weekStart, index)
	);
}
