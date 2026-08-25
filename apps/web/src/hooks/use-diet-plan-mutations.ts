import type { CreateDietPlanInput } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isConflictError } from "@/lib/api/conflict-error";
import { invalidateDietPlanQueries } from "@/lib/api/invalidate-diet-plan-queries";
import {
	createDietPlan,
	type DietPlanUpdateBody,
	deleteDietPlan,
	updateDietPlan,
} from "@/lib/api/queries/diet-plans";
import type { FoodCatalogScope } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * Diet-plan writes, for both the admin and the nutritionist trees.
 *
 * `PATCH` and `DELETE` both answer **409** once the plan has any assignment:
 * an assigned plan is immutable and undeletable, because members are eating
 * from it. The screens render that refusal as a standing notice, so it is not
 * toasted here.
 */

export function useCreateDietPlanMutation(scope: FoodCatalogScope) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateDietPlanInput) => createDietPlan(scope, input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the diet plan")
			);
		},
		onSuccess: async () => {
			toast.success("Diet plan created");
			await invalidateDietPlanQueries(queryClient);
		},
	});
}

export function useUpdateDietPlanMutation(
	scope: FoodCatalogScope,
	dietPlanId: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (body: DietPlanUpdateBody) =>
			updateDietPlan(scope, dietPlanId, body),
		onError: (error) => {
			if (isConflictError(error)) {
				return;
			}
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the diet plan")
			);
		},
		onSuccess: async () => {
			toast.success("Diet plan updated");
			await invalidateDietPlanQueries(queryClient);
		},
	});
}

export function useDeleteDietPlanMutation(
	scope: FoodCatalogScope,
	dietPlanId: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteDietPlan(scope, dietPlanId),
		onError: (error) => {
			if (isConflictError(error)) {
				return;
			}
			toast.error(
				getUserFacingErrorMessage(error, "Could not delete the diet plan")
			);
		},
		onSuccess: async () => {
			toast.success("Diet plan deleted");
			await invalidateDietPlanQueries(queryClient);
		},
	});
}
