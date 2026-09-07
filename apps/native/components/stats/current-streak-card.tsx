import { StyleSheet, View } from "react-native";
import { StreakBadge } from "@/components/streak-badge";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

type CurrentStreakCardProps = Readonly<{
	streak: number;
	isLoading: boolean;
	error: unknown;
}>;

/**
 * Card showing the user's current consumption streak (consecutive days with ≥1 logged meal).
 * Uses shared StreakBadge for the flame + count display.
 */
export function CurrentStreakCard({
	streak,
	isLoading,
	error,
}: CurrentStreakCardProps) {
	const colors = useColors();
	const elevation = useShadows();

	return (
		<View style={[styles.card, { backgroundColor: colors.card }, elevation.md]}>
			<View style={styles.streakRow}>
				<View>
					<Text size="lg" weight="bold">
						Current Streak
					</Text>
					<Text muted size="sm">
						Keep it going!
					</Text>
				</View>
				<StreakBadge
					error={error}
					isLoading={isLoading}
					numberSize="3xl"
					streak={streak}
				/>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		borderRadius: radii.xl,
		padding: spacing[5],
		marginBottom: spacing[4],
	},
	streakRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
});
