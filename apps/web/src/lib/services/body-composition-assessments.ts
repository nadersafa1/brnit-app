import { db } from '@burn-app/db'
import {
  bodyCompositionAssessment,
  member,
} from '@burn-app/db/schema'
import { count, asc, desc, eq, and } from 'drizzle-orm'
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

async function getMemberOrgId(memberId: string): Promise<string | null> {
  const [m] = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.id, memberId))
    .limit(1)
  return m?.organizationId ?? null
}

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
}

export type MemberRecentAssessmentsResult = {
  organization: { id: string; name: string }
  assessments: MemberRecentAssessmentItem[]
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

  const assessments: MemberRecentAssessmentItem[] = items.map(a => ({
    id: a.id,
    assessedAt: a.assessedAt,
    bodyFatPercent: parseNumeric(a.bodyFatPercent),
    weightKg: parseNumeric(a.weightKg),
    heightCm: parseNumeric(a.heightCm),
    bmi: parseNumeric(a.bmi),
    muscleMassKg: parseNumeric(a.muscleMassKg),
    visceralFatAreaCm2: parseNumeric(a.visceralFatAreaCm2),
    bodyWaterL: parseNumeric(a.bodyWaterL),
    imageUrl: a.imageUrl,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }))
  return {
    organization: {
      id: context.organizationId,
      name: context.organizationName,
    },
    assessments,
  }
}

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

export async function updateBodyCompositionAssessment(
  id: string,
  data: UpdateBodyCompositionAssessment,
  organizationId: string,
  options?: { file?: File; clearImage?: boolean }
): Promise<UpdateAssessmentResult> {
  const belongs = await assessmentBelongsToOrg(id, organizationId)
  if (!belongs) {
    const existing = await getBodyCompositionAssessmentById(id)
    if (!existing) {
      return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }
    }
    return { ok: false, error: 'Assessment does not belong to this organization', code: 'WRONG_ORG' }
  }

  const existing = await db
    .select()
    .from(bodyCompositionAssessment)
    .where(eq(bodyCompositionAssessment.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)
  if (!existing) return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }

  let newImagePublicId: string | null | undefined = undefined
  if (options?.clearImage) {
    if (existing.imagePublicId) {
      await deleteCloudinaryImage(existing.imagePublicId)
    }
    newImagePublicId = null
  } else if (options?.file) {
    if (existing.imagePublicId) {
      await deleteCloudinaryImage(existing.imagePublicId)
    }
    const { publicId } = await uploadFileToCloudinary(options.file, BODY_ASSESSMENT_IMAGE_FOLDER)
    newImagePublicId = publicId
  }

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

export async function deleteBodyCompositionAssessment(
  id: string,
  organizationId: string
): Promise<DeleteAssessmentResult> {
  const belongs = await assessmentBelongsToOrg(id, organizationId)
  if (!belongs) {
    const existing = await getBodyCompositionAssessmentById(id)
    if (!existing) {
      return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }
    }
    return { ok: false, error: 'Assessment does not belong to this organization', code: 'WRONG_ORG' }
  }

  const existing = await db
    .select({ imagePublicId: bodyCompositionAssessment.imagePublicId })
    .from(bodyCompositionAssessment)
    .where(eq(bodyCompositionAssessment.id, id))
    .limit(1)
    .then(rows => rows[0] ?? null)
  if (!existing) return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }

  if (existing.imagePublicId) {
    await deleteCloudinaryImage(existing.imagePublicId)
  }

  await db.delete(bodyCompositionAssessment).where(eq(bodyCompositionAssessment.id, id))
  return { ok: true }
}
