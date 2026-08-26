import type { CreateMealInput, MealDto } from "@brnit/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { isConflictError } from "@/lib/api/conflict-error";
import { invalidateMealQueries } from "@/lib/api/invalidate-meal-queries";
import {
	cloneMeal,
	createMeal,
	deleteMeal,
	type MealUpdateBody,
	updateMeal,
} from "@/lib/api/queries/meals";
import type { FoodCatalogScope } from "@/lib/api/query-keys";
import { getUserFacingErrorMessage } from "@/lib/get-error-message";

/**
 * Meal writes, for both the admin and the nutritionist trees — the endpoints
 * are identical behind different guards, so the scope is a parameter rather
 * than a second copy of this module.
 *
 * `PATCH` and `DELETE` both answer **409** on a blocking rule: a meal inside an
 * assigned plan cannot be edited, and a meal that still holds items or is used
 * by a plan cannot be deleted. Those are surfaced by the screens as standing
 * notices (`mutation.error` -> `readConflictMessage`), so they are deliberately
 * not toasted here.
 */

export function useCreateMealMutation(scope: FoodCatalogScope) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateMealInput) => createMeal(scope, input),
		onError: (error) => {
			toast.error(
				getUserFacingErrorMessage(error, "Could not create the meal")
			);
		},
		onSuccess: async () => {
			toast.success("Meal created");
			await invalidateMealQueries(queryClient);
		},
	});
}

export function useUpdateMealMutation(scope: FoodCatalogScope, mealId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (body: MealUpdateBody) => updateMeal(scope, mealId, body),
		onError: (error) => {
			if (isConflictError(error)) {
				return;
			}
			toast.error(
				getUserFacingErrorMessage(error, "Could not update the meal")
			);
		},
		onSuccess: async () => {
			// The PATCH answers with the meal **header** only, so the detail entry
			// is re-fetched rather than written from the response — writing it
			// would drop `mealItems[]`.
			toast.success("Meal updated");
			await invalidateMealQueries(queryClient);
		},
	});
}

/**
 * Server-side clone. Resolves with the new meal so the caller can open it —
 * the pre-overhaul list row cloned and navigated straight to the copy.
 */
export function useCloneMealMutation(scope: FoodCatalogScope) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (mealId: string) => cloneMeal(scope, mealId),
		onError: (error) => {
			toast.error(getUserFacingErrorMessage(error, "Could not clone the meal"));
		},
		onSuccess: async (meal: MealDto) => {
			toast.success(`Cloned as “${meal.name}”`);
			await invalidateMealQueries(queryClient);
		},
	});
}

export function useDeleteMealMutation(scope: FoodCatalogScope, mealId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteMeal(scope, mealId),
		onError: (error) => {
			if (isConflictError(error)) {
				return;
			}
			toast.error(
				getUserFacingErrorMessage(error, "Could not delete the meal")
			);
		},
		onSuccess: async () => {
			toast.success("Meal deleted");
			await invalidateMealQueries(queryClient);
		},
	});
}
