import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import {
	FlatList,
	type ListRenderItemInfo,
	Pressable,
	StyleSheet,
	View,
} from "react-native";
import { Text } from "@/components/ui/text";
import {
	CALENDAR_STRIP_VIEWABILITY_CONFIG,
	useCalendarStrip,
} from "@/hooks/use-calendar-strip";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";
import type { WeekData } from "@/utils/horizontal-calendar";

import { CalendarWeekRow } from "./calendar-week-row";

interface CalendarStripProps {
	onDateSelect: (date: Date) => void;
	selectedDate: Date;
}

/** Horizontal week calendar with infinite scroll (past/future) and a month header. */
export function CalendarStrip({
	selectedDate,
	onDateSelect,
}: Readonly<CalendarStripProps>) {
	const colors = useColors();
	const elevation = useShadows();
	const {
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
	} = useCalendarStrip({ selectedDate, onDateSelect });

	const renderWeek = useCallback(
		(info: ListRenderItemInfo<WeekData>) => (
			<CalendarWeekRow
				dayPillWidth={dayPillWidth}
				onDayPress={handleDayPress}
				selectedDate={selectedDate}
				weekStart={info.item.weekStart}
				weekWidth={weekWidth}
			/>
		),
		[selectedDate, weekWidth, dayPillWidth, handleDayPress]
	);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text size="base" style={styles.monthLabel} weight="semibold">
					{monthLabel}
				</Text>
				{!isCurrentWeek && (
					<Pressable
						onPress={jumpToToday}
						style={({ pressed }) => [
							styles.todayButton,
							{
								backgroundColor: colors.accent,
								transform: [{ scale: pressed ? 0.95 : 1 }],
							},
							elevation.sm,
						]}
					>
						<Ionicons color={colors.onAccent} name="calendar" size={16} />
					</Pressable>
				)}
			</View>

			<FlatList
				contentContainerStyle={{ paddingHorizontal: spacing[4] }}
				data={weeks}
				decelerationRate="fast"
				getItemLayout={getItemLayout}
				horizontal
				initialScrollIndex={initialVisibleIndex}
				keyExtractor={(week) => week.id}
				maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
				maxToRenderPerBatch={3}
				onViewableItemsChanged={handleViewableItemsChanged}
				ref={flatListRef}
				renderItem={renderWeek}
				showsHorizontalScrollIndicator={false}
				snapToInterval={weekWidth}
				viewabilityConfig={CALENDAR_STRIP_VIEWABILITY_CONFIG}
				windowSize={5}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginBottom: spacing[4],
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[3],
		paddingHorizontal: spacing[2],
	},
	monthLabel: {
		flex: 1,
		textAlign: "center",
	},
	todayButton: {
		width: 32,
		height: 32,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
		marginLeft: spacing[2],
	},
});
