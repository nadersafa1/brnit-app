import type { OrganizationContextDto } from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { organizationContextQueryKey } from "@/lib/api/query-keys";

const ORGANIZATION_CONTEXT_STALE_TIME_MS = 60_000;

/**
 * The active organization and the role flags derived from it.
 *
 * The endpoint answers 200 with the anonymous shape when there is no session,
 * so this query never errors on first paint and never needs an `enabled` guard.
 * Route guards read it through `ensureQueryData`, and the sidebar reads the same
 * cache entry — one request per session, not one per consumer.
 */
export function organizationContextQueryOptions() {
	return queryOptions({
		queryFn: () =>
			fetchApiJson<OrganizationContextDto>(
				"/api/users/me/organization-context"
			),
		queryKey: organizationContextQueryKey(),
		staleTime: ORGANIZATION_CONTEXT_STALE_TIME_MS,
	});
}
