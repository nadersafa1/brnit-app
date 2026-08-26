import { StyleSheet, View } from "react-native";

import { isSameLocalDay, toLocalDateString } from "@/lib/date/calendar-date";
import { formatWeekdayShort } from "@/lib/date/format-date";
import { expandWeekDays } from "@/utils/horizontal-calendar";

import { DayPill } from "./day-pill";

export interface CalendarWeekRowProps {
	dayPillWidth: number;
	onDayPress: (date: Date) => void;
	selectedDate: Date;
	weekStart: Date;
	weekWidth: number;
}

/** Renders a single week row: 7 day pills. */
export function CalendarWeekRow({
	weekStart,
	selectedDate,
	weekWidth,
	dayPillWidth,
	onDayPress,
}: Readonly<CalendarWeekRowProps>) {
	const days = expandWeekDays(weekStart);

	return (
		<View style={[styles.row, { width: weekWidth }]}>
			{days.map((day) => (
				<View key={toLocalDateString(day)} style={{ width: dayPillWidth }}>
					<DayPill
						date={day}
						day={formatWeekdayShort(day)}
						isSelected={isSameLocalDay(selectedDate, day)}
						onPress={() => onDayPress(day)}
					/>
				</View>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: "row",
	},
});
