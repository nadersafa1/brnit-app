import type {
	AssessmentDto,
	ListAssessmentsInput,
	PaginatedResponse,
	SortOrder,
} from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	type AssessmentScope,
	bodyCompositionAssessmentsQueryKey,
} from "@/lib/api/query-keys";

/**
 * Body-composition assessments.
 *
 * Reads are served under two prefixes — `direct-admin` writes, `nutritionist`
 * reads the same rows behind its own guard — so the scope is a parameter and
 * part of the cache key. Writes exist on the direct-admin tree only.
 *
 * Every endpoint is scoped **server-side** to the caller's active organization;
 * the `organizationId` threaded through here never reaches the wire. It keys the
 * cache so switching organizations mid-session cannot show the previous one's
 * rows while the refetch is in flight.
 */

/** Derived from the server's own schema, so a renamed column cannot drift. */
type AssessmentSortBy = NonNullable<ListAssessmentsInput["sortBy"]>;

/**
 * The member screen is not a paginated table: it shows the member's history
 * newest-first on a single page, which is the server's ceiling for `perPage`.
 */
export const MEMBER_ASSESSMENTS_PER_PAGE = MAX_PER_PAGE;
export const MEMBER_ASSESSMENTS_PAGE = 1;

/**
 * Fixed for every read in this app. They are deliberately **not** in the query
 * key (`query-keys.ts` keys on scope, organization, member and page): a second
 * sort order would need a key segment before it could be offered.
 */
const ASSESSMENTS_SORT_BY: AssessmentSortBy = "assessedAt";
const ASSESSMENTS_SORT_ORDER: SortOrder = "desc";

interface AssessmentResponse {
	data: AssessmentDto;
}

interface DeletedAssessmentResponse {
	data: { deleted: true };
}

type AssessmentListResponse = PaginatedResponse<AssessmentDto>;

function assessmentsPath(scope: AssessmentScope): string {
	return `/api/${scope}/body-composition-assessments`;
}

function assessmentPath(assessmentId: string): string {
	return `${assessmentsPath("direct-admin")}/${encodeURIComponent(assessmentId)}`;
}

/**
 * One member's assessments, newest first.
 *
 * `enabled` covers the two states the screen legitimately starts in: an app
 * admin who has not picked an organization yet, and a route rendered before its
 * `memberId` param resolves.
 */
export function memberAssessmentsQueryOptions(
	scope: AssessmentScope,
	organizationId: string,
	memberId: string
) {
	const params = new URLSearchParams({
		memberId,
		page: String(MEMBER_ASSESSMENTS_PAGE),
		perPage: String(MEMBER_ASSESSMENTS_PER_PAGE),
		sortBy: ASSESSMENTS_SORT_BY,
		sortOrder: ASSESSMENTS_SORT_ORDER,
	});

	return queryOptions({
		enabled: organizationId.length > 0 && memberId.length > 0,
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<AssessmentListResponse>(
				`${assessmentsPath(scope)}?${params.toString()}`
			),
		queryKey: bodyCompositionAssessmentsQueryKey(scope, organizationId, {
			memberId,
			page: MEMBER_ASSESSMENTS_PAGE,
			perPage: MEMBER_ASSESSMENTS_PER_PAGE,
		}),
	});
}

// ---------------------------------------------------------------------------
// Writes — direct admin only, and always multipart
// ---------------------------------------------------------------------------

/**
 * The seven metrics, as the write endpoints take them.
 *
 * The bodies are `multipart/form-data` (the InBody photo rides along with the
 * numbers), so every value is serialised to a string and the server's schema
 * coerces it back.
 */
export interface AssessmentMetrics {
	bmi: number;
	bodyFatPercent: number;
	bodyWaterL: number;
	heightCm: number;
	muscleMassKg: number;
	visceralFatAreaCm2: number;
	weightKg: number;
}

export interface CreateAssessmentFields extends AssessmentMetrics {
	/** ISO datetime. */
	assessedAt: string;
	memberId: string;
}

/**
 * PATCH takes any subset. An **absent** key means "leave this column alone" —
 * which is why nothing here is ever serialised as `""`: a blank multipart field
 * used to coerce to `0` and silently zero a metric.
 */
export type UpdateAssessmentFields = Partial<AssessmentMetrics> & {
	assessedAt?: string;
};

export interface AssessmentImageOptions {
	/** Deletes the stored image. Ignored when a replacement `file` is supplied. */
	clearImage?: boolean;
	file?: File | null;
}

const METRIC_KEYS = [
	"bmi",
	"bodyFatPercent",
	"bodyWaterL",
	"heightCm",
	"muscleMassKg",
	"visceralFatAreaCm2",
	"weightKg",
] as const satisfies readonly (keyof AssessmentMetrics)[];

/**
 * `clearImage` is `'true'` because that is one of the two literals the server's
 * schema accepts (`'1'` is the other); anything else means "leave the image".
 */
function appendImage(formData: FormData, image?: AssessmentImageOptions): void {
	if (image?.file) {
		formData.append("file", image.file);
	} else if (image?.clearImage) {
		formData.append("clearImage", "true");
	}
}

export function buildCreateAssessmentFormData(
	fields: CreateAssessmentFields,
	image?: AssessmentImageOptions
): FormData {
	const formData = new FormData();
	formData.append("memberId", fields.memberId);
	formData.append("assessedAt", fields.assessedAt);
	for (const key of METRIC_KEYS) {
		formData.append(key, String(fields[key]));
	}
	appendImage(formData, image);
	return formData;
}

export function buildUpdateAssessmentFormData(
	fields: UpdateAssessmentFields,
	image?: AssessmentImageOptions
): FormData {
	const formData = new FormData();
	if (fields.assessedAt !== undefined) {
		formData.append("assessedAt", fields.assessedAt);
	}
	for (const key of METRIC_KEYS) {
		const value = fields[key];
		if (value !== undefined) {
			formData.append(key, String(value));
		}
	}
	appendImage(formData, image);
	return formData;
}

export async function createAssessment(
	fields: CreateAssessmentFields,
	image?: AssessmentImageOptions
): Promise<AssessmentDto> {
	const response = await fetchApiJson<AssessmentResponse>(
		assessmentsPath("direct-admin"),
		{ body: buildCreateAssessmentFormData(fields, image), method: "POST" }
	);
	return response.data;
}

export async function updateAssessment(
	assessmentId: string,
	fields: UpdateAssessmentFields,
	image?: AssessmentImageOptions
): Promise<AssessmentDto> {
	const response = await fetchApiJson<AssessmentResponse>(
		assessmentPath(assessmentId),
		{
			body: buildUpdateAssessmentFormData(fields, image),
			method: "PATCH",
		}
	);
	return response.data;
}

/**
 * The server destroys the Cloudinary asset **before** the row, so a failure can
 * leave the row in place. Callers reflect the response rather than removing the
 * row optimistically.
 */
export function deleteAssessment(
	assessmentId: string
): Promise<DeletedAssessmentResponse> {
	return fetchApiJson<DeletedAssessmentResponse>(assessmentPath(assessmentId), {
		method: "DELETE",
	});
}
