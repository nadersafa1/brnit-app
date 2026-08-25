import type { QueryClient } from "@tanstack/react-query";

import { invalidateFoodItemQueries } from "@/lib/api/invalidate-food-item-queries";
import {
	foodCategoriesQueries,
	foodCategoryQueries,
} from "@/lib/api/query-keys";

/**
 * Refreshes every cached view of a food category after a write.
 *
 * The food-item families come along because a category is **denormalised into
 * every food item that references it** — `FoodItemDto.categories[]` carries the
 * name, so a rename leaves the food-items table and the category detail's own
 * item list showing the old one. Reusing the existing food-item helper keeps
 * that fan-out defined in exactly one place.
 *
 * Deletes never widen this: the API refuses with 409 while any item is still
 * filed under the category, so a delete that succeeds touched nothing else.
 */
export async function invalidateFoodCategoryQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: foodCategoriesQueries() }),
		queryClient.invalidateQueries({ queryKey: foodCategoryQueries() }),
		invalidateFoodItemQueries(queryClient),
	]);
}
