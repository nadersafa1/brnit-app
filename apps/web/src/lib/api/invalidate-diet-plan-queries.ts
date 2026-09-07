import type { QueryClient } from "@tanstack/react-query";

import { dietPlanQueries, dietPlansQueries } from "@/lib/api/query-keys";

/**
 * Refreshes every cached view of a diet plan after a write.
 *
 * The list root is included even for a pure slot edit: each list row carries
 * `slotCount`, so adding or removing a slot changes the list as well as the
 * detail. Both scopes (`admin` and `nutritionist`) sit under these two prefixes.
 */
export async function invalidateDietPlanQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: dietPlansQueries() }),
		queryClient.invalidateQueries({ queryKey: dietPlanQueries() }),
	]);
}
