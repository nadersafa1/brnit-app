import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConsumptionSlot } from "@/lib/api/consumption-slot";
import { deleteMealConsumption } from "@/lib/api/delete-meal-consumption";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { ApiError } from "@/lib/api/types";
import {
	ConsumptionDateOutOfAllowedWindowError,
	isWithinConsumptionDateWindow,
} from "@/lib/consumption-date-window";
import { showError, showSuccess } from "@/lib/feedback";
import { memberKeys } from "@/lib/queries/keys";

const NOT_FOUND_STATUS = 404;
const OUT_OF_WINDOW_MESSAGE =
	"You can only unmark consumption for today or the allowed backdate window.";

/**
 * Unmarks a meal. Eligibility uses the **device's** calendar, matching
 * `useMarkMealConsumed` — see `lib/date/calendar-date.ts`.
 *
 * A 404 means the consumption is already gone, so the member queries are
 * invalidated on that path too and the UI converges on the truth.
 */
export function useUnmarkMealConsumed() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: ConsumptionSlot) => {
			if (!isWithinConsumptionDateWindow(variables.consumedDate)) {
				throw new ConsumptionDateOutOfAllowedWindowError();
			}

			return deleteMealConsumption({
				consumedDate: variables.consumedDate,
				dietPlanAssignmentId: variables.dietPlanAssignmentId,
				dietPlanMealId: variables.dietPlanMealId,
			});
		},
		onSuccess: () => {
			showSuccess("Meal unmarked");
			queryClient.invalidateQueries({ queryKey: memberKeys.all });
		},
		onError: (error: unknown) => {
			if (error instanceof ConsumptionDateOutOfAllowedWindowError) {
				showError(OUT_OF_WINDOW_MESSAGE);
				return;
			}
			showError(
				getApiErrorMessage(error, "Could not unmark meal", {
					404: "Consumption not found",
				})
			);
			if (error instanceof ApiError && error.status === NOT_FOUND_STATUS) {
				queryClient.invalidateQueries({ queryKey: memberKeys.all });
			}
		},
	});
}
