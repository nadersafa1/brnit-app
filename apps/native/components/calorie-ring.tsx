import { StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";

interface CalorieRingProps {
	consumed: number;
	goal: number;
	size?: number;
}

export function CalorieRing({
	consumed,
	goal,
	size = 180,
}: Readonly<CalorieRingProps>) {
	const colors = useColors();
	const strokeWidth = 14;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;
	const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
	const strokeDashoffset = circumference * (1 - progress);

	return (
		<View style={styles.container}>
			<Svg height={size} width={size}>
				<Defs>
					<LinearGradient
						id="progressGradient"
						x1="0%"
						x2="100%"
						y1="0%"
						y2="0%"
					>
						<Stop offset="0%" stopColor={colors.accent} />
						<Stop offset="100%" stopColor={colors.accentLight} />
					</LinearGradient>
				</Defs>
				<Circle
					cx={size / 2}
					cy={size / 2}
					fill="none"
					r={radius}
					stroke={colors.surfaceAlt}
					strokeWidth={strokeWidth}
				/>
				<Circle
					cx={size / 2}
					cy={size / 2}
					fill="none"
					r={radius}
					stroke="url(#progressGradient)"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					strokeWidth={strokeWidth}
					transform={`rotate(-90, ${size / 2}, ${size / 2})`}
				/>
			</Svg>
			<View style={styles.centerContent}>
				<Text size="4xl" weight="bold">
					{consumed}
				</Text>
				<Text muted size="sm" weight="medium">
					of {goal} kcal
				</Text>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		justifyContent: "center",
	},
	centerContent: {
		position: "absolute",
		alignItems: "center",
	},
});
