import { db } from "@brnit/db";
import {
	bodyCompositionAssessment,
	member,
	organization,
} from "@brnit/db/schema";
import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import { combineConditions } from "../db/query-conditions";
import { calculateOffset } from "../pagination/offset";
import type { ListAssessmentsInput } from "./schemas";

/**
 * Database access for body-composition assessments.
 *
 * Org scoping is always an `INNER JOIN member ON member.organization_id = ?`
 * rather than a filter on the assessment row, because the assessment itself
 * carries no organization — only its member does.
 */

export interface AssessmentRow {
	assessedAt: Date;
	bmi: string;
	bodyFatPercent: string;
	bodyWaterL: string;
	createdAt: Date;
	heightCm: string;
	id: string;
	imagePublicId: string | null;
	memberId: string;
	muscleMassKg: string;
	recordedById: string;
	updatedAt: Date;
	visceralFatAreaCm2: string;
	weightKg: string;
}

/** Shared projection so every read returns the same {@link AssessmentRow}. */
const assessmentColumns = {
	assessedAt: bodyCompositionAssessment.assessedAt,
	bmi: bodyCompositionAssessment.bmi,
	bodyFatPercent: bodyCompositionAssessment.bodyFatPercent,
	bodyWaterL: bodyCompositionAssessment.bodyWaterL,
	createdAt: bodyCompositionAssessment.createdAt,
	heightCm: bodyCompositionAssessment.heightCm,
	id: bodyCompositionAssessment.id,
	imagePublicId: bodyCompositionAssessment.imagePublicId,
	memberId: bodyCompositionAssessment.memberId,
	muscleMassKg: bodyCompositionAssessment.muscleMassKg,
	recordedById: bodyCompositionAssessment.recordedById,
	updatedAt: bodyCompositionAssessment.updatedAt,
	visceralFatAreaCm2: bodyCompositionAssessment.visceralFatAreaCm2,
	weightKg: bodyCompositionAssessment.weightKg,
} as const;

const sortColumns = {
	assessedAt: bodyCompositionAssessment.assessedAt,
	createdAt: bodyCompositionAssessment.createdAt,
} as const;

export interface AssessmentInsertValues {
	assessedAt: Date;
	bmi: string;
	bodyFatPercent: string;
	bodyWaterL: string;
	heightCm: string;
	imagePublicId: string | null;
	memberId: string;
	muscleMassKg: string;
	recordedById: string;
	visceralFatAreaCm2: string;
	weightKg: string;
}

export interface AssessmentUpdateValues {
	assessedAt?: Date;
	bmi?: string;
	bodyFatPercent?: string;
	bodyWaterL?: string;
	heightCm?: string;
	imagePublicId?: string | null;
	muscleMassKg?: string;
	visceralFatAreaCm2?: string;
	weightKg?: string;
}

/** The organization a member belongs to, or `null` when the member is gone. */
export async function findMemberOrganizationId(
	memberId: string
): Promise<string | null> {
	const rows = await db
		.select({ organizationId: member.organizationId })
		.from(member)
		.where(eq(member.id, memberId))
		.limit(1);
	return rows[0]?.organizationId ?? null;
}

/** True when the assessment's member sits in `organizationId`. */
export async function assessmentBelongsToOrganization(
	assessmentId: string,
	organizationId: string
): Promise<boolean> {
	const rows = await db
		.select({ id: bodyCompositionAssessment.id })
		.from(bodyCompositionAssessment)
		.innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
		.where(
			and(
				eq(bodyCompositionAssessment.id, assessmentId),
				eq(member.organizationId, organizationId)
			)
		)
		.limit(1);
	return rows.length > 0;
}

/** Row lookup with no ownership check; callers pair it with a scope check. */
export async function findAssessmentById(
	assessmentId: string
): Promise<AssessmentRow | null> {
	const rows = await db
		.select(assessmentColumns)
		.from(bodyCompositionAssessment)
		.where(eq(bodyCompositionAssessment.id, assessmentId))
		.limit(1);
	return rows[0] ?? null;
}

/** Row lookup that also enforces "this is the member's own assessment". */
export async function findAssessmentForMember(
	assessmentId: string,
	memberId: string
): Promise<AssessmentRow | null> {
	const rows = await db
		.select(assessmentColumns)
		.from(bodyCompositionAssessment)
		.where(
			and(
				eq(bodyCompositionAssessment.id, assessmentId),
				eq(bodyCompositionAssessment.memberId, memberId)
			)
		)
		.limit(1);
	return rows[0] ?? null;
}

export async function listAssessmentsForOrganization(
	input: ListAssessmentsInput,
	organizationId: string
): Promise<{ items: AssessmentRow[]; totalItems: number }> {
	const where = combineConditions([
		eq(member.organizationId, organizationId),
		input.memberId
			? eq(bodyCompositionAssessment.memberId, input.memberId)
			: undefined,
	]);

	const sortColumn = sortColumns[input.sortBy ?? "assessedAt"];
	const direction = input.sortOrder === "asc" ? asc : desc;

	// Count and page run in parallel — neither depends on the other.
	const [countRows, items] = await Promise.all([
		db
			.select({ count: count() })
			.from(bodyCompositionAssessment)
			.innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
			.where(where),
		db
			.select(assessmentColumns)
			.from(bodyCompositionAssessment)
			.innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
			.where(where)
			.orderBy(direction(sortColumn))
			.limit(input.perPage)
			.offset(calculateOffset(input.page, input.perPage)),
	]);

	return { items, totalItems: countRows[0]?.count ?? 0 };
}

export async function insertAssessment(
	values: AssessmentInsertValues
): Promise<AssessmentRow | null> {
	const rows = await db
		.insert(bodyCompositionAssessment)
		.values(values)
		.returning(assessmentColumns);
	return rows[0] ?? null;
}

export async function updateAssessment(
	assessmentId: string,
	values: AssessmentUpdateValues
): Promise<AssessmentRow | null> {
	const rows = await db
		.update(bodyCompositionAssessment)
		.set(values)
		.where(eq(bodyCompositionAssessment.id, assessmentId))
		.returning(assessmentColumns);
	return rows[0] ?? null;
}

export async function deleteAssessment(assessmentId: string): Promise<void> {
	await db
		.delete(bodyCompositionAssessment)
		.where(eq(bodyCompositionAssessment.id, assessmentId));
}

export interface MemberOrganizationLink {
	memberId: string;
	organization: { id: string; name: string };
}

/** Every membership of a user, with the organization each one belongs to. */
export async function listMembershipsWithOrganization(
	userId: string
): Promise<MemberOrganizationLink[]> {
	const rows = await db
		.select({
			memberId: member.id,
			organizationId: organization.id,
			organizationName: organization.name,
		})
		.from(member)
		.innerJoin(organization, eq(member.organizationId, organization.id))
		.where(eq(member.userId, userId));

	return rows.map((row) => ({
		memberId: row.memberId,
		organization: { id: row.organizationId, name: row.organizationName },
	}));
}

/** Most recent assessments across a set of members, newest assessment first. */
export async function listRecentAssessmentsForMembers(
	memberIds: readonly string[],
	limit: number
): Promise<AssessmentRow[]> {
	if (memberIds.length === 0) {
		return [];
	}
	return await db
		.select(assessmentColumns)
		.from(bodyCompositionAssessment)
		.where(inArray(bodyCompositionAssessment.memberId, [...memberIds]))
		.orderBy(desc(bodyCompositionAssessment.assessedAt))
		.limit(limit);
}
