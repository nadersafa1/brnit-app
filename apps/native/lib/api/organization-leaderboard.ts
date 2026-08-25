import type { OrganizationLeaderboardDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

function buildLeaderboardUrl(orgId?: string): string {
	const base = API_ENDPOINTS.member.organizationLeaderboard;
	if (!orgId) {
		return base;
	}
	return `${base}?orgId=${encodeURIComponent(orgId)}`;
}

/** Body-fat percentage-point drop leaderboard: top three plus the caller. */
export function getOrganizationLeaderboard(
	options?: { orgId?: string } & Pick<ApiFetchOptions, "signal">
): Promise<OrganizationLeaderboardDto> {
	const { orgId, signal } = options ?? {};
	return apiFetch<OrganizationLeaderboardDto>(buildLeaderboardUrl(orgId), {
		method: "GET",
		signal,
	});
}
