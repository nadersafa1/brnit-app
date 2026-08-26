import type { AssessmentDto, PaginatedResponse } from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { bodyCompositionAssessmentsQueryKey } from "@/lib/api/query-keys";

/**
 * A member's body-composition history, read through the nutritionist's
 * **read-only** mirror of the direct-admin endpoint. Writes live in
 * `/dashboard/direct-admin`; this screen only shows what was recorded.
 *
 * The list is org-scoped server-side via a join on `member.organizationId`, so
 * the key carries the organization even though the request does not.
 */

const ASSESSMENTS_PATH = "/api/nutritionist/body-composition-assessments";

const ASSESSMENT_PAGE = 1;

export type AssessmentListResponse = PaginatedResponse<AssessmentDto>;

/** `enabled` gates on the session's active organization — see the assignments module. */
export function memberAssessmentsQueryOptions(
	organizationId: string,
	memberId: string,
	enabled = true
) {
	const filters = {
		memberId,
		page: ASSESSMENT_PAGE,
		perPage: MAX_PER_PAGE,
	};
	const search = new URLSearchParams({
		memberId,
		page: String(filters.page),
		perPage: String(filters.perPage),
		sortBy: "assessedAt",
		sortOrder: "desc",
	});

	return queryOptions({
		enabled: enabled && organizationId.length > 0 && memberId.length > 0,
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<AssessmentListResponse>(
				`${ASSESSMENTS_PATH}?${search.toString()}`
			),
		queryKey: bodyCompositionAssessmentsQueryKey(
			"nutritionist",
			organizationId,
			filters
		),
	});
}
