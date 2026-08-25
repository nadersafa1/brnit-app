import type { CurrentDietPlanMealDto } from "@brnit/api";
import { useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { collectOverriddenMealItemSlots } from "@/lib/helpers/overridden-meal-slots";

import { useUndoMealAlternativesForDay } from "./use-undo-meal-alternatives-for-day";

const UNDO_SWAPS_TITLE = "Undo swaps for this day?";
const UNDO_SWAPS_MESSAGE =
	"Meal items you replaced for this date will go back to the original plan.";

/**
 * Header action for the home meals list: confirm, then undo all item swaps
 * visible for the selected calendar day.
 */
export function useUndoSwapsForSelectedDay(
	meals: CurrentDietPlanMealDto[],
	dietPlanAssignmentId: string | undefined,
	consumedDate: string
) {
	const overriddenSlots = useMemo(
		() => collectOverriddenMealItemSlots(meals),
		[meals]
	);
	const undoMutation = useUndoMealAlternativesForDay();

	const canUndoSwaps =
		Boolean(dietPlanAssignmentId) && overriddenSlots.length > 0;

	const requestUndoWithConfirmation = useCallback(() => {
		if (!dietPlanAssignmentId || overriddenSlots.length === 0) {
			return;
		}
		Alert.alert(UNDO_SWAPS_TITLE, UNDO_SWAPS_MESSAGE, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Undo",
				style: "destructive",
				onPress: () =>
					undoMutation.mutate({
						assignmentId: dietPlanAssignmentId,
						date: consumedDate,
						slots: overriddenSlots,
					}),
			},
		]);
	}, [
		dietPlanAssignmentId,
		consumedDate,
		overriddenSlots,
		undoMutation.mutate,
	]);

	return {
		canUndoSwaps,
		requestUndoWithConfirmation,
		isUndoingSwaps: undoMutation.isPending,
	};
}
