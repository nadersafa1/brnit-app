import { useQuery } from "@tanstack/react-query";
import { getOrganizationLeaderboard } from "@/lib/api/organization-leaderboard";
import { memberKeys } from "@/lib/queries/keys";

/** Query hook for organization leaderboard. Pass orgId (required for member app). Disable when no org selected. */
export function useOrganizationLeaderboard(options?: {
	orgId?: string | null;
	enabled?: boolean;
}) {
	const { orgId, enabled = true } = options ?? {};
	return useQuery({
		queryKey: memberKeys.organizationLeaderboard({
			orgId: orgId ?? undefined,
		}),
		queryFn: () =>
			getOrganizationLeaderboard({
				orgId: orgId ?? undefined,
			}),
		enabled: enabled && !!orgId,
	});
}
