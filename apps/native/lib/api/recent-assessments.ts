import type { MemberRecentAssessmentsDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

function buildRecentAssessmentsUrl(limit?: number, orgId?: string): string {
	const base = API_ENDPOINTS.member.recentAssessments;
	const params = new URLSearchParams();
	if (limit != null) {
		params.set("limit", String(limit));
	}
	if (orgId) {
		params.set("orgId", orgId);
	}
	const query = params.toString();
	return query ? `${base}?${query}` : base;
}

/**
 * Recent body-composition assessments for the caller. Without `orgId` the read
 * spans every organization they belong to, and `organization` comes back null.
 */
export function getRecentAssessments(
	options?: { limit?: number; orgId?: string } & Pick<ApiFetchOptions, "signal">
): Promise<MemberRecentAssessmentsDto> {
	const { limit, orgId, signal } = options ?? {};
	return apiFetch<MemberRecentAssessmentsDto>(
		buildRecentAssessmentsUrl(limit, orgId),
		{ method: "GET", signal }
	);
}
