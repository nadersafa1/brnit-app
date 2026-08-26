import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { formatDayOfMonth } from "@/lib/date/format-date";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface DayPillProps {
	date: Date;
	day: string;
	isCompleted?: boolean;
	isSelected?: boolean;
	onPress?: () => void;
}

export function DayPill({ day, date, isSelected, onPress }: DayPillProps) {
	const colors = useColors();
	const dateNumber = formatDayOfMonth(date);

	return (
		<Pressable onPress={onPress} style={styles.container}>
			<Text
				size="xs"
				style={[
					styles.dayLabel,
					{ color: isSelected ? colors.accentFg : colors.muted },
				]}
				weight="medium"
			>
				{day}
			</Text>
			<View
				style={[
					styles.pill,
					{ backgroundColor: isSelected ? colors.accent : colors.surfaceAlt },
				]}
			>
				<Text
					size="sm"
					style={{ color: isSelected ? colors.onAccent : colors.subtle }}
					weight="semibold"
				>
					{dateNumber}
				</Text>
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: "center",
	},
	dayLabel: {
		marginBottom: spacing[1],
	},
	pill: {
		width: 36,
		height: 36,
		borderRadius: radii.pill,
		alignItems: "center",
		justifyContent: "center",
	},
});
