/**
 * Progress card: calorie ring, remaining badge, macro bars, or no-plan message.
 * Purely presentational; receives all values as props.
 */

import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { CalorieRing } from "@/components/calorie-ring";
import { MacroBar } from "@/components/macro-bar";
import { StreakBadge } from "@/components/streak-badge";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors, useShadows } from "@/hooks/use-theme-color";
import { formatMonthDay } from "@/lib/date/format-date";
import { formatCalorieDisplay } from "@/lib/utils/numbers";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface HomeProgressCardProps {
	caloriesConsumed: number;
	caloriesGoal: number;
	carbsConsumed: number;
	carbsGoal: number;
	/** True while the diet plan for the selected day is still loading (avoids flashing the no-plan UI). */
	dietPlanLoading?: boolean;
	fatConsumed: number;
	fatGoal: number;
	hasPlan: boolean;
	isToday: boolean;
	proteinConsumed: number;
	proteinGoal: number;
	remainingCalories: number;
	selectedDate: Date;
	/** Current consumption streak; badge shown in top-right. */
	streak?: number;
	streakError?: unknown;
	streakLoading?: boolean;
}

export function HomeProgressCard({
	hasPlan,
	dietPlanLoading = false,
	isToday,
	selectedDate,
	caloriesConsumed,
	caloriesGoal,
	remainingCalories,
	proteinConsumed,
	proteinGoal,
	carbsConsumed,
	carbsGoal,
	fatConsumed,
	fatGoal,
	streak = 0,
	streakLoading = false,
	streakError,
}: Readonly<HomeProgressCardProps>) {
	const colors = useColors();
	const elevation = useShadows();

	/** Loading, then the no-plan empty state, then the real card. */
	const renderBody = () => {
		if (dietPlanLoading) {
			return (
				<View style={styles.loadingState}>
					<Spinner size="lg" />
				</View>
			);
		}

		if (!hasPlan) {
			return (
				<View style={styles.noPlanMessage}>
					<Ionicons color={colors.muted} name="calendar-outline" size={32} />
					<Text muted size="base" style={styles.noPlanText} weight="medium">
						No plan assigned for this day.
					</Text>
					<Text muted size="sm" style={styles.noPlanSubtext}>
						You don&apos;t have a diet plan assigned for{" "}
						{isToday ? "today" : formatMonthDay(selectedDate)}.
					</Text>
				</View>
			);
		}

		return (
			<>
				<View style={styles.ringContainer}>
					<CalorieRing consumed={caloriesConsumed} goal={caloriesGoal} />
				</View>
				<View style={styles.remainingContainer}>
					<View
						style={[
							styles.remainingBadge,
							{ backgroundColor: colors.successSoft },
						]}
					>
						<Text
							size="sm"
							style={{ color: colors.successFg }}
							weight="semibold"
						>
							{formatCalorieDisplay(remainingCalories)} kcal remaining
						</Text>
					</View>
				</View>
				<View style={styles.macrosRow}>
					<MacroBar
						color="accent"
						current={proteinConsumed}
						goal={proteinGoal}
						label="Protein"
					/>
					<MacroBar
						color="info"
						current={carbsConsumed}
						goal={carbsGoal}
						label="Carbs"
					/>
					<MacroBar
						color="success"
						current={fatConsumed}
						goal={fatGoal}
						label="Fat"
					/>
				</View>
			</>
		);
	};

	return (
		<View
			style={[
				styles.calorieCard,
				{ backgroundColor: colors.card },
				elevation.md,
			]}
		>
			<View style={styles.cardHeader}>
				<Text size="xl" weight="bold">
					{isToday ? "Today's Progress" : formatMonthDay(selectedDate)}
				</Text>
				<StreakBadge
					error={streakError}
					isLoading={streakLoading}
					numberSize="xl"
					streak={streak}
				/>
			</View>

			{renderBody()}
		</View>
	);
}

const styles = StyleSheet.create({
	calorieCard: {
		borderRadius: radii.xl,
		padding: spacing[5],
		marginBottom: spacing[4],
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[4],
	},
	ringContainer: {
		alignItems: "center",
		marginBottom: spacing[5],
	},
	remainingContainer: {
		alignItems: "center",
		marginBottom: spacing[5],
	},
	remainingBadge: {
		paddingHorizontal: spacing[4],
		paddingVertical: spacing[2],
		borderRadius: radii.pill,
	},
	macrosRow: {
		flexDirection: "row",
		gap: spacing[4],
	},
	noPlanMessage: {
		alignItems: "center",
		paddingVertical: spacing[6],
		paddingHorizontal: spacing[4],
	},
	noPlanText: {
		marginTop: spacing[2],
		textAlign: "center",
	},
	noPlanSubtext: {
		marginTop: spacing[1],
		textAlign: "center",
	},
	loadingState: {
		paddingVertical: spacing[8],
		alignItems: "center",
	},
});
