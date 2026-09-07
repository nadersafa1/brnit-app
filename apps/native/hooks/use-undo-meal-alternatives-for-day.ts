import { useMutation, useQueryClient } from "@tanstack/react-query";

import { getApiErrorMessage } from "@/lib/api/error-message";
import {
	type UndoMealAlternativesForDayParams,
	undoMealAlternativesForDay,
} from "@/lib/api/undo-meal-alternatives-for-day";
import { showError, showSuccess } from "@/lib/feedback";
import { memberKeys } from "@/lib/queries/keys";

function successMessageForUndo(slotCount: number): string {
	return slotCount === 1
		? "Meal item restored to the original plan"
		: "Swaps undone for this day";
}

export function useUndoMealAlternativesForDay() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: undoMealAlternativesForDay,
		onSuccess: (_data, variables: UndoMealAlternativesForDayParams) => {
			if (variables.slots.length === 0) {
				return;
			}
			showSuccess(successMessageForUndo(variables.slots.length));
			queryClient.invalidateQueries({
				queryKey: memberKeys.currentDietPlanRoot(),
			});
		},
		onError: (error: unknown) => {
			const message = getApiErrorMessage(error, "Could not undo swaps", {
				403: "You do not have access to this plan",
				404: "Swap was already removed",
			});
			showError(message);
		},
	});
}
