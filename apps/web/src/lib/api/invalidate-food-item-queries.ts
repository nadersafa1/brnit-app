import type { QueryClient } from "@tanstack/react-query";

import { foodItemQueries, foodItemsQueries } from "@/lib/api/query-keys";

/**
 * Refreshes every cached view of the food catalog after a write.
 *
 * Lists and details live under different key roots, and the admin and
 * nutritionist scopes are separate entries again — so "one food item changed"
 * touches four families. Centralising the fan-out is what stops a new call site
 * from invalidating three of them and leaving the fourth stale.
 *
 * Independent invalidations run in parallel; `invalidateQueries` (not `refetch`)
 * so inactive screens refresh when they next mount instead of all at once.
 */
export async function invalidateFoodItemQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: foodItemsQueries() }),
		queryClient.invalidateQueries({ queryKey: foodItemQueries() }),
	]);
}
