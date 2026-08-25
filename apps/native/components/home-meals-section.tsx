/**
 * Meals section: title, optional “undo swaps” for the selected day, then loading /
 * error / empty state or meal cards.
 */

import type {
	CurrentDietPlanMealDto,
	CurrentDietPlanMealItemDto,
} from "@brnit/api";
import { roundUpToTenth } from "@brnit/domain";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import { MealCard } from "@/components/meal-card";
import type { MealItemDetailPayload } from "@/components/meal-item-detail-sheet/types";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { useColors } from "@/hooks/use-theme-color";
import { useUndoSwapsForSelectedDay } from "@/hooks/use-undo-swaps-for-selected-day";
import { formatMealTime, MEAL_TYPE_ICONS } from "@/lib/constants/meals";
import { isLocalToday, toLocalDateString } from "@/lib/date/calendar-date";
import { formatMonthDay } from "@/lib/date/format-date";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

interface HomeMealsSectionProps {
	assignmentEndDate?: string;
	assignmentStartDate?: string;
	/** When present, meal cards show mark-as-consumed and pass it to the API. */
	dietPlanAssignmentId?: string;
	error: Error | null;
	isLoading: boolean;
	maxPastDays?: number;
	meals: CurrentDietPlanMealDto[];
	onMealItemPress?: (params: MealItemDetailPayload) => void;
	selectedDate: Date;
}

export function HomeMealsSection({
	isLoading,
	error,
	meals,
	selectedDate,
	dietPlanAssignmentId,
	assignmentStartDate,
	assignmentEndDate,
	maxPastDays,
	onMealItemPress,
}: Readonly<HomeMealsSectionProps>) {
	const colors = useColors();
	const isToday = isLocalToday(selectedDate);
	const consumedDate = toLocalDateString(selectedDate);

	const { canUndoSwaps, requestUndoWithConfirmation, isUndoingSwaps } =
		useUndoSwapsForSelectedDay(meals, dietPlanAssignmentId, consumedDate);

	const handleMealItemPress = (
		item: CurrentDietPlanMealItemDto,
		dietPlanMealId: string
	) => {
		if (!dietPlanAssignmentId) {
			return;
		}
		onMealItemPress?.({
			item,
			dietPlanAssignmentId,
			dietPlanMealId,
			consumedDate,
		});
	};

	return (
		<>
			<View style={styles.mealsHeader}>
				<Text size="lg" weight="bold">
					{isToday ? "Today's Meals" : `${formatMonthDay(selectedDate)} Meals`}
				</Text>
				{canUndoSwaps ? (
					<Pressable
						accessibilityLabel="Undo all meal swaps for this day"
						accessibilityRole="button"
						disabled={isUndoingSwaps}
						hitSlop={8}
						onPress={requestUndoWithConfirmation}
					>
						<Text
							size="sm"
							style={{ color: isUndoingSwaps ? colors.muted : colors.accentFg }}
							weight="semibold"
						>
							Undo swaps
						</Text>
					</Pressable>
				) : null}
			</View>

			{isLoading && (
				<View style={styles.loadingState}>
					<Spinner size="lg" />
				</View>
			)}

			{error && (
				<View style={[styles.emptyState, { backgroundColor: colors.card }]}>
					<Ionicons
						color={colors.dangerFg}
						name="alert-circle-outline"
						size={32}
					/>
					<Text muted size="sm" style={styles.emptyText}>
						{error.message}
					</Text>
				</View>
			)}

			{!(isLoading || error) && meals.length === 0 && (
				<View style={[styles.emptyState, { backgroundColor: colors.card }]}>
					<Ionicons color={colors.muted} name="restaurant-outline" size={32} />
					<Text size="base" style={styles.emptyTitle} weight="semibold">
						No meals planned
					</Text>
					<Text muted size="sm" style={styles.emptyText}>
						You don't have a diet plan assigned for this date yet.
					</Text>
				</View>
			)}

			{!(isLoading || error) &&
				meals.map((meal) => (
					<MealCard
						assignmentEndDate={assignmentEndDate}
						assignmentStartDate={assignmentStartDate}
						calories={roundUpToTenth(meal.macros.calories)}
						consumed={meal.consumed}
						consumedDate={consumedDate}
						dietPlanAssignmentId={dietPlanAssignmentId}
						dietPlanMealId={meal.dietPlanMealId}
						icon={
							MEAL_TYPE_ICONS[meal.mealType.toLowerCase()] ??
							"restaurant-outline"
						}
						items={meal.mealItems}
						key={meal.dietPlanMealId}
						macros={meal.macros}
						maxPastDays={maxPastDays}
						onMealItemPress={(item) =>
							handleMealItemPress(item, meal.dietPlanMealId)
						}
						time={formatMealTime(meal.mealType, meal.scheduledTime)}
						title={meal.mealName}
					/>
				))}
		</>
	);
}

const styles = StyleSheet.create({
	mealsHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: spacing[3],
	},
	loadingState: {
		paddingVertical: spacing[8],
		alignItems: "center",
	},
	emptyState: {
		paddingVertical: spacing[8],
		paddingHorizontal: spacing[4],
		alignItems: "center",
		borderRadius: radii.xl,
	},
	emptyTitle: {
		marginTop: spacing[2],
	},
	emptyText: {
		marginTop: spacing[1],
		textAlign: "center",
	},
});
