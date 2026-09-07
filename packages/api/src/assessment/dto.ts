import { buildCloudinaryUrl } from "../cloudinary/url";
import type { AssessmentRow } from "./queries";

/**
 * Two assessment shapes cross the wire, and the difference is deliberate.
 *
 * - {@link AssessmentDto} — staff-facing (direct admin, nutritionist). Metrics
 *   stay **strings**, exactly as Drizzle reads the `numeric` columns, because
 *   the admin tables render and re-submit them verbatim.
 * - {@link MemberAssessmentDto} — member-facing. Metrics are normalized to
 *   `number | null` so the native charts can do arithmetic, and the owning
 *   organization is attached so the Stats screen can label the row.
 *
 * Neither shape carries `imagePublicId`: the stored id is an implementation
 * detail and `imageUrl` is the only image field the clients know about.
 */

export interface AssessmentDto {
	assessedAt: string;
	bmi: string;
	bodyFatPercent: string;
	bodyWaterL: string;
	createdAt: string;
	heightCm: string;
	id: string;
	imageUrl: string | null;
	memberId: string;
	muscleMassKg: string;
	recordedById: string;
	updatedAt: string;
	visceralFatAreaCm2: string;
	weightKg: string;
}

export interface AssessmentOrganizationDto {
	id: string;
	name: string;
}

export interface MemberAssessmentDto {
	assessedAt: string;
	bmi: number | null;
	bodyFatPercent: number | null;
	bodyWaterL: number | null;
	createdAt: string;
	heightCm: number | null;
	id: string;
	imageUrl: string | null;
	muscleMassKg: number | null;
	organization: AssessmentOrganizationDto;
	updatedAt: string;
	visceralFatAreaCm2: number | null;
	weightKg: number | null;
}

export interface MemberRecentAssessmentsDto {
	assessments: MemberAssessmentDto[];
	/** `null` when the reader spanned every organization the user belongs to. */
	organization: AssessmentOrganizationDto | null;
}

/** Empty or unparseable stays `null`, so clients can tell "missing" from 0. */
function toNullableNumber(value: string | null | undefined): number | null {
	if (value === null || value === undefined || value === "") {
		return null;
	}
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? null : parsed;
}

/** The delivery URL for a stored `image_public_id`, or `null` when unset. */
export function assessmentImageUrl(
	imagePublicId: string | null
): string | null {
	return imagePublicId ? buildCloudinaryUrl(imagePublicId) : null;
}

export function assessmentToDto(row: AssessmentRow): AssessmentDto {
	return {
		assessedAt: row.assessedAt.toISOString(),
		bmi: row.bmi,
		bodyFatPercent: row.bodyFatPercent,
		bodyWaterL: row.bodyWaterL,
		createdAt: row.createdAt.toISOString(),
		heightCm: row.heightCm,
		id: row.id,
		imageUrl: assessmentImageUrl(row.imagePublicId),
		memberId: row.memberId,
		muscleMassKg: row.muscleMassKg,
		recordedById: row.recordedById,
		updatedAt: row.updatedAt.toISOString(),
		visceralFatAreaCm2: row.visceralFatAreaCm2,
		weightKg: row.weightKg,
	};
}

export function assessmentToMemberDto(
	row: AssessmentRow,
	organization: AssessmentOrganizationDto
): MemberAssessmentDto {
	return {
		assessedAt: row.assessedAt.toISOString(),
		bmi: toNullableNumber(row.bmi),
		bodyFatPercent: toNullableNumber(row.bodyFatPercent),
		bodyWaterL: toNullableNumber(row.bodyWaterL),
		createdAt: row.createdAt.toISOString(),
		heightCm: toNullableNumber(row.heightCm),
		id: row.id,
		imageUrl: assessmentImageUrl(row.imagePublicId),
		muscleMassKg: toNullableNumber(row.muscleMassKg),
		organization,
		updatedAt: row.updatedAt.toISOString(),
		visceralFatAreaCm2: toNullableNumber(row.visceralFatAreaCm2),
		weightKg: toNullableNumber(row.weightKg),
	};
}
