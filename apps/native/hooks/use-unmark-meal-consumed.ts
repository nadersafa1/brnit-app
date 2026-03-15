import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteMealConsumption } from "@/lib/api/delete-meal-consumption";
import type { ConsumptionSlot } from "@/lib/api/consumption-slot";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api";
import { memberKeys } from "@/lib/queries/keys";
import { showError, showSuccess } from "@/lib/feedback";

/** Mutation to unmark a meal (delete consumption). Invalidates member queries on success or 404. */
export function useUnmarkMealConsumed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: ConsumptionSlot) =>
      deleteMealConsumption({
        dietPlanAssignmentId: variables.dietPlanAssignmentId,
        dietPlanMealId: variables.dietPlanMealId,
        consumedDate: variables.consumedDate,
      }),
    onSuccess: () => {
      showSuccess("Meal unmarked");
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
    onError: (error: unknown) => {
      const message = getApiErrorMessage(error, "Could not unmark meal", {
        404: "Consumption not found",
      });
      showError(message);
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: memberKeys.all });
      }
    },
  });
}
