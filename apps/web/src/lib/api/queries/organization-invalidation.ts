import type { QueryClient } from "@tanstack/react-query";

import {
	dietPlanAssignmentQueries,
	dietPlanAssignmentsQueries,
	dietPlanQueries,
	dietPlansQueries,
	organizationContextQueryKey,
	organizationMembersQueries,
	organizationQueryKey,
	organizationsQueryKey,
} from "@/lib/api/query-keys";

/**
 * The named invalidation fan-outs for the organization area.
 *
 * Every organization write touches more than one key family — the roster and
 * the pending invitations live in one entry, the plain member list in another,
 * and the session's resolved scope in a third. Centralising the set is what
 * stops "invite sent" from refreshing two of the three and leaving the sidebar
 * showing yesterday's role.
 *
 * `invalidateQueries` rather than `refetch`, so screens that are not mounted
 * refresh when they next mount instead of all at once.
 */

/** The signed-in user's own scope: role flags, active organization, sidebar. */
export function invalidateOrganizationContextQuery(
	queryClient: QueryClient
): Promise<void> {
	return queryClient.invalidateQueries({
		queryKey: organizationContextQueryKey(),
	});
}

/**
 * Membership or invitations changed inside one organization.
 *
 * The organization list is included because a removal can take the actor out of
 * the organization they were looking at.
 */
export async function invalidateOrganizationQueries(
	queryClient: QueryClient,
	organizationId: string
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: organizationsQueryKey() }),
		queryClient.invalidateQueries({
			queryKey: organizationQueryKey(organizationId),
		}),
		queryClient.invalidateQueries({ queryKey: organizationMembersQueries() }),
		invalidateOrganizationContextQuery(queryClient),
	]);
}

/** Lists and details of assignments live under different roots. */
export async function invalidateDietPlanAssignmentQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: dietPlanAssignmentsQueries() }),
		queryClient.invalidateQueries({ queryKey: dietPlanAssignmentQueries() }),
	]);
}

/** A new plan has to appear in the picker before it can be assigned. */
export async function invalidateDietPlanQueries(
	queryClient: QueryClient
): Promise<void> {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: dietPlansQueries() }),
		queryClient.invalidateQueries({ queryKey: dietPlanQueries() }),
	]);
}
