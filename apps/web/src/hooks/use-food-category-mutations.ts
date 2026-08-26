import type { FoodCategoryDto } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isConflictError } from "@/lib/api/conflict-error";
import { invalidateFoodCategoryQueries } from "@/lib/api/invalidate-food-category-queries";
import {
	createFoodCategory,
	deleteFoodCategory,
	type FoodCategoryWriteFields,
	updateFoodCategory,
} from "@/lib/api/queries/food-categories";
import { foodCategoryQueryKey } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * The mutation shape every write on this app follows:
 *
 *   mutationFn -> onError: toast the server's reason -> onSuccess: toast, then
 *   `await` a **named** invalidation helper.
 *
 * The invalidation is awaited so `isPending` stays true until the lists have
 * actually refreshed — otherwise a dialog closes onto stale rows.
 *
 * One deliberate exception to the toast: a **409** is a blocking rule, not a
 * transient failure. The screens render `mutation.error` as a standing notice
 * inside the dialog that caused it, so toasting it as well would say the same
 * thing twice and then take it away.
 */

export function useCreateFoodCategoryMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (fields: FoodCategoryWriteFields) => createFoodCategory(fields),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the category")
			);
		},
		onSuccess: async () => {
			toast.success("Category created");
			await invalidateFoodCategoryQueries(queryClient);
		},
	});
}

export function useUpdateFoodCategoryMutation(foodCategoryId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (fields: FoodCategoryWriteFields) =>
			updateFoodCategory(foodCategoryId, fields),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the category")
			);
		},
		onSuccess: async (category: FoodCategoryDto) => {
			// The response is the updated row, so the detail cache is written
			// directly and only the lists have to be re-fetched.
			queryClient.setQueryData(
				foodCategoryQueryKey("admin", foodCategoryId),
				category
			);
			toast.success("Category updated");
			await invalidateFoodCategoryQueries(queryClient);
		},
	});
}

export function useDeleteFoodCategoryMutation(foodCategoryId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteFoodCategory(foodCategoryId),
		onError: (error) => {
			// 409: food items are still filed under this category. The delete
			// dialog stays open and names the blocker.
			if (isConflictError(error)) {
				return;
			}
			toast.error(
				getUserFacingErrorMessage(error, "Could not delete the category")
			);
		},
		onSuccess: async () => {
			queryClient.removeQueries({
				queryKey: foodCategoryQueryKey("admin", foodCategoryId),
			});
			toast.success("Category deleted");
			await invalidateFoodCategoryQueries(queryClient);
		},
	});
}
