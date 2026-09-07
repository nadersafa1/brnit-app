import type { FoodItemDto } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { invalidateFoodItemQueries } from "@/lib/api/invalidate-food-item-queries";
import {
	createFoodItem,
	deleteFoodItem,
	type FoodItemImageOptions,
	type FoodItemWriteFields,
	updateFoodItem,
} from "@/lib/api/queries/food-items";
import { foodItemQueryKey } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * The mutation shape every write on this app follows:
 *
 *   mutationFn → onError: toast the server's reason → onSuccess: toast, then
 *   `await` a **named** invalidation helper.
 *
 * The invalidation is awaited so `isPending` stays true until the lists have
 * actually refreshed — otherwise a dialog closes onto stale rows. The fan-out
 * itself lives in `lib/api/invalidate-food-item-queries.ts` so create, update
 * and delete cannot drift from one another.
 */

export interface FoodItemWritePayload {
	fields: FoodItemWriteFields;
	image?: FoodItemImageOptions;
}

export function useCreateFoodItemMutation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: FoodItemWritePayload) =>
			createFoodItem(payload.fields, payload.image),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the food item")
			);
		},
		onSuccess: async () => {
			toast.success("Food item created");
			await invalidateFoodItemQueries(queryClient);
		},
	});
}

export function useUpdateFoodItemMutation(foodItemId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (payload: FoodItemWritePayload) =>
			updateFoodItem(foodItemId, payload.fields, payload.image),
		onError: (error) => {
			// A 409 here is the blocking-reference rule: the item is used by a meal,
			// an override or a logged consumption. The server's message names which.
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the food item")
			);
		},
		onSuccess: async (foodItem: FoodItemDto) => {
			// The response is the updated row, so the detail cache is written
			// directly and only the lists have to be re-fetched.
			queryClient.setQueryData(foodItemQueryKey("admin", foodItemId), foodItem);
			toast.success("Food item updated");
			await invalidateFoodItemQueries(queryClient);
		},
	});
}

export function useDeleteFoodItemMutation(foodItemId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteFoodItem(foodItemId),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not delete the food item")
			);
		},
		onSuccess: async () => {
			queryClient.removeQueries({
				queryKey: foodItemQueryKey("admin", foodItemId),
			});
			toast.success("Food item deleted");
			await invalidateFoodItemQueries(queryClient);
		},
	});
}
