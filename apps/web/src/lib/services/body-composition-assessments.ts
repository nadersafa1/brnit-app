import { db } from '@burn-app/db'
import {
  bodyCompositionAssessment,
  member,
} from '@burn-app/db/schema'
import { count, asc, desc, eq, and } from 'drizzle-orm'
import { calculateOffset } from '@/lib/api-helpers/query-builders'
import {
  extractPublicId,
  isCloudinaryUrl,
  deleteCloudinaryImage,
} from '@/lib/cloudinary-utils'
import type {
  BodyCompositionAssessmentsQuery,
  CreateBodyCompositionAssessment,
  UpdateBodyCompositionAssessment,
} from '@/types/api/body-composition-assessment.schemas'

export type CreateAssessmentResult =
  | { ok: true; data: (typeof bodyCompositionAssessment.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'WRONG_ORG' }

export type UpdateAssessmentResult =
  | { ok: true; data: (typeof bodyCompositionAssessment.$inferSelect) }
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

export async function createBodyCompositionAssessment(
  data: CreateBodyCompositionAssessment,
  recordedById: string,
  organizationId: string
): Promise<CreateAssessmentResult> {
  const memberOrgId = await getMemberOrgId(data.memberId)
  if (!memberOrgId) {
    return { ok: false, error: 'Member not found', code: 'NOT_FOUND' }
  }
  if (memberOrgId !== organizationId) {
    return { ok: false, error: 'Member does not belong to this organization', code: 'WRONG_ORG' }
  }

  const imageUrl = data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : null

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
      imageUrl,
    })
    .returning()

  if (!created) return { ok: false, error: 'Failed to create assessment', code: 'NOT_FOUND' }
  return { ok: true, data: created }
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
    imageUrl: a.imageUrl,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function getBodyCompositionAssessmentById(id: string) {
  const [row] = await db
    .select()
    .from(bodyCompositionAssessment)
    .where(eq(bodyCompositionAssessment.id, id))
    .limit(1)
  return row ?? null
}

export async function updateBodyCompositionAssessment(
  id: string,
  data: UpdateBodyCompositionAssessment,
  organizationId: string
): Promise<UpdateAssessmentResult> {
  const belongs = await assessmentBelongsToOrg(id, organizationId)
  if (!belongs) {
    const existing = await getBodyCompositionAssessmentById(id)
    if (!existing) {
      return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }
    }
    return { ok: false, error: 'Assessment does not belong to this organization', code: 'WRONG_ORG' }
  }

  const existing = await getBodyCompositionAssessmentById(id)
  if (!existing) return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }

  if (data.imageUrl !== undefined) {
    const newImageUrl = data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : null
    const oldImageUrl = existing.imageUrl
    if (oldImageUrl && isCloudinaryUrl(oldImageUrl) && oldImageUrl !== newImageUrl) {
      const publicId = extractPublicId(oldImageUrl)
      if (publicId) {
        await deleteCloudinaryImage(publicId)
      }
    }
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
  if (data.imageUrl !== undefined) {
    updateValues.imageUrl =
      data.imageUrl && data.imageUrl.trim() !== '' ? data.imageUrl : null
  }

  const [updated] = await db
    .update(bodyCompositionAssessment)
    .set(updateValues)
    .where(eq(bodyCompositionAssessment.id, id))
    .returning()

  if (!updated) return { ok: false, error: 'Failed to update assessment', code: 'NOT_FOUND' }
  return { ok: true, data: updated }
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

  const existing = await getBodyCompositionAssessmentById(id)
  if (!existing) return { ok: false, error: 'Assessment not found', code: 'NOT_FOUND' }

  if (existing.imageUrl && isCloudinaryUrl(existing.imageUrl)) {
    const publicId = extractPublicId(existing.imageUrl)
    if (publicId) {
      await deleteCloudinaryImage(publicId)
    }
  }

  await db.delete(bodyCompositionAssessment).where(eq(bodyCompositionAssessment.id, id))
  return { ok: true }
}
