/**
 * Reusable streak display: flame icon + count.
 * Used in HomeProgressCard (header) and CurrentStreakCard.
 * Shows loading spinner in place of flame and "—" for count when loading or error.
 */

import { StyleSheet, View } from "react-native";
import { FlameIcon } from "@/components/ui/flame-icon";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { spacing } from "@/theme/spacing";

/** Active streak uses a larger flame; zero streak stays muted and smaller (previous Ionicons behavior). */
const FLAME_SIZE_ACTIVE = 28;
const FLAME_SIZE_ZERO = 18;

type TextSizeVariant = "xl" | "3xl";

export type StreakBadgeProps = Readonly<{
	streak: number;
	isLoading: boolean;
	error: unknown;
	/** Size of the streak number text. Default 'xl' for inline/compact use, '3xl' for emphasis. */
	numberSize?: TextSizeVariant;
}>;

export function StreakBadge({
	streak,
	isLoading,
	error,
	numberSize = "xl",
}: StreakBadgeProps) {
	const colors = useColors();
	const isZeroStreak = streak === 0;
	const flameSize = isZeroStreak ? FLAME_SIZE_ZERO : FLAME_SIZE_ACTIVE;
	const accentColor = isZeroStreak ? colors.muted : colors.accentFg;

	const displayValue = isLoading || error ? "—" : streak;

	return (
		<View style={styles.container}>
			{isLoading ? (
				<Spinner color={colors.muted} size="sm" />
			) : (
				<FlameIcon color={accentColor} size={flameSize} />
			)}
			<Text
				size={numberSize}
				style={[styles.number, { color: accentColor }]}
				weight="bold"
			>
				{displayValue}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: spacing[2],
	},
	number: {
		minWidth: 20,
	},
});
