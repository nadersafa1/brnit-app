import { db } from '@burn-app/db'
import {
  bodyCompositionAssessment,
  member,
  organization,
} from '@burn-app/db/schema'
import { count, asc, desc, eq, and, inArray } from 'drizzle-orm'
import { calculateOffset } from '@/lib/api-helpers/query-builders'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'
import type {
  BodyCompositionAssessmentsQuery,
  CreateBodyCompositionAssessment,
  MemberRecentAssessmentsQuery,
  UpdateBodyCompositionAssessment,
} from '@/types/api/body-composition-assessment.schemas'

/** API response shape: DB row with imageUrl computed from imagePublicId */
export type AssessmentResponse = Omit<
  (typeof bodyCompositionAssessment.$inferSelect),
  'imagePublicId'
> & { imageUrl: string | null }

export type CreateAssessmentResult =
  | { ok: true; data: AssessmentResponse }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'WRONG_ORG' }

export type UpdateAssessmentResult =
  | { ok: true; data: AssessmentResponse }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'WRONG_ORG' }

export type DeleteAssessmentResult =
  | { ok: true }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'WRONG_ORG' }

/** Resolves the organization id for a member (used for org-scoped validation). */
async function getMemberOrgId(memberId: string): Promise<string | null> {
  const [m] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.id, memberId))
    .limit(1)
  return m?.organizationId ?? null
}

/** Returns whether the assessment's member belongs to the given organization (for admin ownership checks). */
export async function assessmentBelongsToOrg(
  assessmentId: string,
  organizationId: string
): Promise<boolean> {
  const [row] = await db
    .select({
      memberOrganizationId: member.organizationId,
    })
    .from(bodyCompositionAssessment)
    .innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
    .where(eq(bodyCompositionAssessment.id, assessmentId))
    .limit(1)
  return row?.memberOrganizationId === organizationId
}

const BODY_ASSESSMENT_IMAGE_FOLDER = 'body-composition-assessments'

/**
 * Creates a body-composition assessment for a member. Validates member belongs to org; optional image upload.
 */
export async function createBodyCompositionAssessment(
  data: CreateBodyCompositionAssessment,
  recordedById: string,
  organizationId: string,
  options?: { file?: File }
): Promise<CreateAssessmentResult> {
  const memberOrgId = await getMemberOrgId(data.memberId)
  if (!memberOrgId) {
    return { ok: false, error: 'Member not found', code: 'NOT_FOUND' }
  }
  if (memberOrgId !== organizationId) {
    return { ok: false, error: 'Member does not belong to this organization', code: 'WRONG_ORG' }
  }

  let imagePublicId: string | null = null
  if (options?.file) {
    const { publicId } = await uploadFileToCloudinary(options.file, BODY_ASSESSMENT_IMAGE_FOLDER)
    imagePublicId = publicId
  }

  const [created] = await db
    .insert(bodyCompositionAssessment)
    .values({
      memberId: data.memberId,
      assessedAt: new Date(data.assessedAt),
      recordedById,
      heightCm: String(data.heightCm),
      bodyFatPercent: String(data.bodyFatPercent),
      weightKg: String(data.weightKg),
      bmi: String(data.bmi),
      muscleMassKg: String(data.muscleMassKg),
      visceralFatAreaCm2: String(data.visceralFatAreaCm2),
      bodyWaterL: String(data.bodyWaterL),
      imagePublicId,
    })
    .returning()

  if (!created) return { ok: false, error: 'Failed to create assessment', code: 'NOT_FOUND' }
  return {
    ok: true,
    data: {
      ...created,
      imageUrl: created.imagePublicId ? buildCloudinaryUrl(created.imagePublicId) : null,
    },
  }
}

/**
 * Lists body-composition assessments for an org with pagination and optional member filter.
 * Count and data fetch run in parallel for performance.
 */
export async function listBodyCompositionAssessments(
  query: BodyCompositionAssessmentsQuery,
  organizationId: string
) {
  const { page, perPage, sortBy, sortOrder, memberId } = query
  const offset = calculateOffset(page, perPage)

  const conditions = [eq(member.organizationId, organizationId)]
  if (memberId) conditions.push(eq(bodyCompositionAssessment.memberId, memberId))
  const where = and(...conditions)

  const sortFieldMap = {
    assessedAt: bodyCompositionAssessment.assessedAt,
    createdAt: bodyCompositionAssessment.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'assessedAt'] ?? bodyCompositionAssessment.assessedAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const baseQuery = db
    .select()
    .from(bodyCompositionAssessment)
    .innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
    .where(where)

  const [countResult, rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(bodyCompositionAssessment)
      .innerJoin(member, eq(bodyCompositionAssessment.memberId, member.id))
      .where(where),
    baseQuery
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  const items = rows.map(({ body_composition_assessment: a }) => ({
    id: a.id,
    memberId: a.memberId,
    assessedAt: a.assessedAt,
    recordedById: a.recordedById,
    heightCm: a.heightCm,
    bodyFatPercent: a.bodyFatPercent,
    weightKg: a.weightKg,
    bmi: a.bmi,
    muscleMassKg: a.muscleMassKg,
    visceralFatAreaCm2: a.visceralFatAreaCm2,
    bodyWaterL: a.bodyWaterL,
    imageUrl: a.imagePublicId ? buildCloudinaryUrl(a.imagePublicId) : null,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/**
 * Normalizes DB numeric strings to numbers for API responses.
 * Returns null for empty or invalid values so clients can distinguish missing data.
 */
function parseNumeric(value: string | null | undefined): number | null {
  if (value == null || value === '') return null
  const n = Number.parseFloat(value)
  return Number.isNaN(n) ? null : n
}

export type MemberRecentAssessmentItem = {
  id: string
  assessedAt: Date
  bodyFatPercent: number | null
  weightKg: number | null
  heightCm: number | null
  bmi: number | null
  muscleMassKg: number | null
  visceralFatAreaCm2: number | null
  bodyWaterL: number | null
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
  /** Organization this assessment belongs to (so client can show "for which org"). */
  organization: { id: string; name: string }
}

export type MemberRecentAssessmentsResult = {
  /** Single org when scoped by orgId; null when no orgId (assessments from all user's memberships). */
  organization: { id: string; name: string } | null
  assessments: MemberRecentAssessmentItem[]
}

/** Fallback when member–org mapping is missing (should not happen for valid data). */
const UNKNOWN_ORGANIZATION: { id: string; name: string } = { id: '', name: 'Unknown' }

type AssessmentLikeRow = {
  id: string
  assessedAt: Date
  bodyFatPercent: string | null
  weightKg: string | null
  heightCm: string | null
  bmi: string | null
  muscleMassKg: string | null
  visceralFatAreaCm2: string | null
  bodyWaterL: string | null
  createdAt: Date
  updatedAt: Date
}

/** DB row shape when we have imagePublicId (e.g. from select()); used for single-assessment normalization. */
type AssessmentRowWithImage = AssessmentLikeRow & { imagePublicId: string | null }

/** Single source of truth: normalized metrics + imageUrl (no organization). Used by list and single-get. */
function normalizedAssessmentFields(
  row: AssessmentLikeRow,
  imageUrl: string | null
): Omit<MemberRecentAssessmentItem, 'organization'> {
  return {
    id: row.id,
    assessedAt: row.assessedAt,
    bodyFatPercent: parseNumeric(row.bodyFatPercent),
    weightKg: parseNumeric(row.weightKg),
    heightCm: parseNumeric(row.heightCm),
    bmi: parseNumeric(row.bmi),
    muscleMassKg: parseNumeric(row.muscleMassKg),
    visceralFatAreaCm2: parseNumeric(row.visceralFatAreaCm2),
    bodyWaterL: parseNumeric(row.bodyWaterL),
    imageUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Maps a DB/API assessment row plus org and image URL into the member-facing list item. */
function toMemberRecentItem(
  row: AssessmentLikeRow,
  organization: { id: string; name: string },
  imageUrl: string | null
): MemberRecentAssessmentItem {
  return { ...normalizedAssessmentFields(row, imageUrl), organization }
}

/** Builds normalized member-facing assessment from a full DB row (for single-get endpoint). */
function rowToNormalizedAssessment(row: AssessmentRowWithImage): Omit<MemberRecentAssessmentItem, 'organization'> {
  const imageUrl = row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null
  return normalizedAssessmentFields(row, imageUrl)
}

/**
 * Returns the current member's most recent body-composition assessments in the given org.
 * Used by the member-facing recent-assessments endpoint; response includes org info and normalized numerics.
 */
export async function getRecentAssessmentsForMember(
  query: MemberRecentAssessmentsQuery,
  context: { memberId: string; organizationId: string; organizationName: string }
): Promise<MemberRecentAssessmentsResult> {
  const { limit } = query

  const { items } = await listBodyCompositionAssessments(
    {
      memberId: context.memberId,
      page: 1,
      perPage: limit,
      sortBy: 'assessedAt',
      sortOrder: 'desc',
    },
    context.organizationId
  )

  const org = { id: context.organizationId, name: context.organizationName }
  const assessments = items.map(a =>
    toMemberRecentItem(
      {
        id: a.id,
        assessedAt: a.assessedAt,
        bodyFatPercent: a.bodyFatPercent,
        weightKg: a.weightKg,
        heightCm: a.heightCm,
        bmi: a.bmi,
        muscleMassKg: a.muscleMassKg,
        visceralFatAreaCm2: a.visceralFatAreaCm2,
        bodyWaterL: a.bodyWaterL,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      org,
      a.imageUrl
    )
  )
  return { organization: org, assessments }
}

/**
 * Returns recent body-composition assessments for every member linked to the given user
 * (across all organizations). Used when no orgId is sent. Each assessment includes its
 * organization so the client can show which org it belongs to.
 */
export async function getRecentAssessmentsForUserAllOrgs(
  userId: string,
  limit: number
): Promise<MemberRecentAssessmentsResult> {
  // Load all memberships for the user with org id and name (needed to attach org per assessment).
  const membersWithOrg = await db
    .select({
      memberId: member.id,
      organizationId: organization.id,
      organizationName: organization.name,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, userId))

  if (membersWithOrg.length === 0) {
    return { organization: null, assessments: [] }
  }

  const memberIds = membersWithOrg.map(m => m.memberId)
  const memberToOrg = new Map(
    membersWithOrg.map(m => [m.memberId, { id: m.organizationId, name: m.organizationName }])
  )

  // Single query: assessments for any of the user's members, most recent first.
  const rows = await db
    .select({
      id: bodyCompositionAssessment.id,
      memberId: bodyCompositionAssessment.memberId,
      assessedAt: bodyCompositionAssessment.assessedAt,
      heightCm: bodyCompositionAssessment.heightCm,
      bodyFatPercent: bodyCompositionAssessment.bodyFatPercent,
      weightKg: bodyCompositionAssessment.weightKg,
      bmi: bodyCompositionAssessment.bmi,
      muscleMassKg: bodyCompositionAssessment.muscleMassKg,
      visceralFatAreaCm2: bodyCompositionAssessment.visceralFatAreaCm2,
      bodyWaterL: bodyCompositionAssessment.bodyWaterL,
      imagePublicId: bodyCompositionAssessment.imagePublicId,
      createdAt: bodyCompositionAssessment.createdAt,
      updatedAt: bodyCompositionAssessment.updatedAt,
    })
    .from(bodyCompositionAssessment)
    .where(inArray(bodyCompositionAssessment.memberId, memberIds))
    .orderBy(desc(bodyCompositionAssessment.assessedAt))
    .limit(limit)

  const assessments = rows.map(a =>
    toMemberRecentItem(
      {
        id: a.id,
        assessedAt: a.assessedAt,
        bodyFatPercent: a.bodyFatPercent,
        weightKg: a.weightKg,
        heightCm: a.heightCm,
        bmi: a.bmi,
        muscleMassKg: a.muscleMassKg,
        visceralFatAreaCm2: a.visceralFatAreaCm2,
        bodyWaterL: a.bodyWaterL,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      },
      memberToOrg.get(a.memberId) ?? UNKNOWN_ORGANIZATION,
      a.imagePublicId ? buildCloudinaryUrl(a.imagePublicId) : null
    )
  )

  return { organization: null, assessments }
}

/** Fetches an assessment by id with no ownership check (admin/cross-org use). */
export async function getBodyCompositionAssessmentById(id: string) {
  const [row] = await db
    .select()
    .from(bodyCompositionAssessment)
    .where(eq(bodyCompositionAssessment.id, id))
    .limit(1)
  if (!row) return null
  return {
    ...row,
    imageUrl: row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null,
  }
}

/** Single assessment for member endpoint: same shape as list item but organization added by route. */
export type SingleAssessmentForMember = Omit<MemberRecentAssessmentItem, 'organization'>

/**
 * Returns a single body-composition assessment only if it belongs to the given member.
 * Used by the member-facing single-assessment endpoint. Returns null when not found or not owned
 * (404 in both cases to avoid leaking existence). Route adds organization from context.
 */
export async function getBodyCompositionAssessmentByIdForMember(
  assessmentId: string,
  memberId: string
): Promise<SingleAssessmentForMember | null> {
  const [row] = await db
    .select()
    .from(bodyCompositionAssessment)
    .where(
      and(
        eq(bodyCompositionAssessment.id, assessmentId),
        eq(bodyCompositionAssessment.memberId, memberId)
      )
    )
    .limit(1)
  if (!row) return null
  return rowToNormalizedAssessment(row)
}

/**
 * Returns an error result when mutation (update/delete) is not allowed (wrong org or missing);
 * otherwise null so caller can proceed. Shared by update and delete to avoid duplication.
 */
function mutationOwnershipError(
  belongs: boolean,
  existing: { imagePublicId: string | null } | null
): UpdateAssessmentResult | DeleteAssessmentResult | null {
  if (!belongs) {
    return existing
      ? { ok: false, error: 'Assessment does not belong to this organization', code: 'WRONG_ORG' }
      : { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }
  }
  return existing ? null : { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }
}

/** Handles clearImage and file upload; returns new imagePublicId (undefined = leave unchanged). */
async function resolveImagePublicIdForUpdate(
  existingImagePublicId: string | null,
  options?: { file?: File; clearImage?: boolean }
): Promise<string | null | undefined> {
  if (options?.clearImage) {
    if (existingImagePublicId) await deleteCloudinaryImage(existingImagePublicId)
    return null
  }
  if (options?.file) {
    if (existingImagePublicId) await deleteCloudinaryImage(existingImagePublicId)
    const { publicId } = await uploadFileToCloudinary(options.file, BODY_ASSESSMENT_IMAGE_FOLDER)
    return publicId
  }
  return undefined
}

/** Builds the DB update record from request data and optional new imagePublicId. */
function buildAssessmentUpdateValues(
  data: UpdateBodyCompositionAssessment,
  newImagePublicId: string | null | undefined
): Record<string, unknown> {
  const updateValues: Record<string, unknown> = {}
  if (data.assessedAt !== undefined) updateValues.assessedAt = new Date(data.assessedAt)
  if (data.heightCm !== undefined) updateValues.heightCm = String(data.heightCm)
  if (data.bodyFatPercent !== undefined) updateValues.bodyFatPercent = String(data.bodyFatPercent)
  if (data.weightKg !== undefined) updateValues.weightKg = String(data.weightKg)
  if (data.bmi !== undefined) updateValues.bmi = String(data.bmi)
  if (data.muscleMassKg !== undefined) updateValues.muscleMassKg = String(data.muscleMassKg)
  if (data.visceralFatAreaCm2 !== undefined)
    updateValues.visceralFatAreaCm2 = String(data.visceralFatAreaCm2)
  if (data.bodyWaterL !== undefined) updateValues.bodyWaterL = String(data.bodyWaterL)
  if (newImagePublicId !== undefined) updateValues.imagePublicId = newImagePublicId
  return updateValues
}

/**
 * Updates a body-composition assessment. Verifies org ownership then applies field/image updates.
 * Cloudinary delete/upload are sequential; DB update is a single write (no transaction with external ops).
 */
export async function updateBodyCompositionAssessment(
  id: string,
  data: UpdateBodyCompositionAssessment,
  organizationId: string,
  options?: { file?: File; clearImage?: boolean }
): Promise<UpdateAssessmentResult> {
  const [belongs, existingRows] = await Promise.all([
    assessmentBelongsToOrg(id, organizationId),
    db
      .select()
      .from(bodyCompositionAssessment)
      .where(eq(bodyCompositionAssessment.id, id))
      .limit(1),
  ])
  const existing = existingRows[0] ?? null

  const ownershipErr = mutationOwnershipError(belongs, existing)
  if (ownershipErr) return ownershipErr as UpdateAssessmentResult

  const newImagePublicId = await resolveImagePublicIdForUpdate(
    existing.imagePublicId,
    options,
  )
  const updateValues = buildAssessmentUpdateValues(data, newImagePublicId)

  const [updated] = await db
    .update(bodyCompositionAssessment)
    .set(updateValues)
    .where(eq(bodyCompositionAssessment.id, id))
    .returning()

  if (!updated) return { ok: false, error: 'Failed to update assessment', code: 'NOT_FOUND' }
  return {
    ok: true,
    data: {
      ...updated,
      imageUrl: updated.imagePublicId ? buildCloudinaryUrl(updated.imagePublicId) : null,
    },
  }
}

/**
 * Deletes a body-composition assessment after verifying org ownership. Removes Cloudinary image if present.
 * Ownership check and row fetch run in parallel; no transaction (single delete + optional external Cloudinary call).
 */
export async function deleteBodyCompositionAssessment(
  id: string,
  organizationId: string
): Promise<DeleteAssessmentResult> {
  const [belongs, existingRows] = await Promise.all([
    assessmentBelongsToOrg(id, organizationId),
    db
      .select({ imagePublicId: bodyCompositionAssessment.imagePublicId })
      .from(bodyCompositionAssessment)
      .where(eq(bodyCompositionAssessment.id, id))
      .limit(1),
  ])
  const existing = existingRows[0] ?? null

  const ownershipErr = mutationOwnershipError(belongs, existing)
  if (ownershipErr) return ownershipErr as DeleteAssessmentResult

  if (existing.imagePublicId) {
    await deleteCloudinaryImage(existing.imagePublicId)
  }

  await db.delete(bodyCompositionAssessment).where(eq(bodyCompositionAssessment.id, id))
  return { ok: true }
}
