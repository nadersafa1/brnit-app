import { StyleSheet, View } from "react-native";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface MacroBarProps {
	color: "accent" | "info" | "success";
	current: number;
	goal: number;
	label: string;
	unit?: string;
}

export function MacroBar({
	label,
	current,
	goal,
	color,
	unit = "g",
}: Readonly<MacroBarProps>) {
	const colors = useColors();
	const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
	const progressColor = colors[color];

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text size="xs" style={{ color: colors.subtle }} weight="semibold">
					{label}
				</Text>
				<Text muted size="xs" weight="medium">
					{current}/{goal}
					{unit}
				</Text>
			</View>
			<View style={[styles.track, { backgroundColor: colors.border }]}>
				<View
					style={[
						styles.progress,
						{ backgroundColor: progressColor, width: `${progress * 100}%` },
					]}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		marginBottom: spacing[1],
	},
	track: {
		height: 8,
		borderRadius: radii.pill,
		overflow: "hidden",
	},
	progress: {
		height: "100%",
		borderRadius: radii.pill,
	},
});
