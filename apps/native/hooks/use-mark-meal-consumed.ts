import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ConsumptionSlot } from "@/lib/api/consumption-slot";
import { getApiErrorMessage } from "@/lib/api/error-message";
import { markMealConsumed } from "@/lib/api/mark-meal-consumed";
import {
	ConsumptionDateOutOfAllowedWindowError,
	isWithinConsumptionDateWindow,
} from "@/lib/consumption-date-window";
import { localDateStringToNoonInstant } from "@/lib/date/calendar-date";
import { showError, showSuccess } from "@/lib/feedback";
import { memberKeys } from "@/lib/queries/keys";

const OUT_OF_WINDOW_MESSAGE =
	"You can only mark consumption for today or the allowed backdate window.";

/**
 * Marks a meal eaten for one day.
 *
 * Both halves of brnit's date convention live here: eligibility is checked
 * against the **device's** calendar, and `consumedAt` is sent as **12:00
 * local** so the server's UTC reckoning lands on the same day. Neither half
 * works without the other — see `lib/date/calendar-date.ts`.
 */
export function useMarkMealConsumed() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: ConsumptionSlot) => {
			const consumedAt = localDateStringToNoonInstant(variables.consumedDate);
			if (
				consumedAt === null ||
				!isWithinConsumptionDateWindow(variables.consumedDate)
			) {
				throw new ConsumptionDateOutOfAllowedWindowError();
			}

			return markMealConsumed({
				consumedAt: consumedAt.toISOString(),
				dietPlanAssignmentId: variables.dietPlanAssignmentId,
				dietPlanMealId: variables.dietPlanMealId,
			});
		},
		onSuccess: () => {
			showSuccess("Meal marked as consumed");
			queryClient.invalidateQueries({ queryKey: memberKeys.all });
		},
		onError: (error: unknown) => {
			if (error instanceof ConsumptionDateOutOfAllowedWindowError) {
				showError(OUT_OF_WINDOW_MESSAGE);
				return;
			}
			showError(
				getApiErrorMessage(error, "Could not mark meal", {
					409: "Already marked for this day",
				})
			);
		},
	});
}
