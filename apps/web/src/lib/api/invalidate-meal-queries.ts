import type { QueryClient } from "@tanstack/react-query";

import {
	dietPlanQueries,
	mealQueries,
	mealsQueries,
} from "@/lib/api/query-keys";

/**
 * Refreshes every cached view of a meal after a write.
 *
 * Three families, not two. Meal lists and meal details live under different key
 * roots, and a **diet-plan detail** embeds each slot's `mealName` and its
 * `mealItems[]` — so renaming a meal or changing a line silently restates what
 * an unassigned plan says it contains. (An *assigned* plan cannot be reached
 * this way: the API answers 409 before the meal changes at all.)
 *
 * Diet-plan *lists* are untouched: they carry only the plan header and
 * `slotCount`, neither of which a meal write can move.
 *
 * `invalidateQueries` rather than `refetch`, so screens that are not mounted
 * refresh when they next appear instead of all at once.
 */
export async function invalidateMealQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: mealsQueries() }),
		queryClient.invalidateQueries({ queryKey: mealQueries() }),
		queryClient.invalidateQueries({ queryKey: dietPlanQueries() }),
	]);
}
