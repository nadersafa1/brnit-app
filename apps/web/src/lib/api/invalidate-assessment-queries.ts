import type { QueryClient } from "@tanstack/react-query";

import {
	bodyCompositionAssessmentQueries,
	bodyCompositionAssessmentsQueries,
} from "@/lib/api/query-keys";

/**
 * Refreshes every cached view of body-composition assessments after a write.
 *
 * Lists and details live under different key roots, and each list key also
 * carries a scope (`direct-admin` writes, `nutritionist` reads the same rows) —
 * so "one assessment changed" touches both families across both trees.
 * Centralising the fan-out is what stops create, update and delete from
 * drifting apart.
 *
 * Independent invalidations run in parallel; `invalidateQueries` (not `refetch`)
 * so a screen that is not mounted refreshes when it next mounts.
 */
export async function invalidateAssessmentQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({
			queryKey: bodyCompositionAssessmentsQueries(),
		}),
		queryClient.invalidateQueries({
			queryKey: bodyCompositionAssessmentQueries(),
		}),
	]);
}
