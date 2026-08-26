import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api/error-message";
import {
	type SetMealItemOverrideParams,
	setMealItemOverride,
} from "@/lib/api/set-meal-item-override";
import { showError, showSuccess } from "@/lib/feedback";
import { memberKeys } from "@/lib/queries/keys";

export function useSetMealItemOverride() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (variables: SetMealItemOverrideParams) =>
			setMealItemOverride(variables),
		onSuccess: () => {
			showSuccess("Meal item replaced");
			queryClient.invalidateQueries({
				queryKey: memberKeys.currentDietPlanRoot(),
			});
		},
		onError: (error: unknown) => {
			const message = getApiErrorMessage(error, "Could not replace meal item", {
				403: "You do not have access to this plan",
				404: "Meal item not found",
			});
			showError(message);
		},
	});
}
