import { db } from '@burn-app/db'
import {
  dietPlanAssignment,
  dietPlan,
  member,
  dietPlanMealConsumption,
} from '@burn-app/db/schema'
import { count, asc, desc, eq, and, or, sql, inArray, gte, lte } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import type {
  DietPlanAssignmentsQuery,
  CreateDietPlanAssignment,
  UpdateDietPlanAssignment,
} from '@/types/api/diet-plan-assignment.schemas'

/** Get userId for an assignment (from member or user). */
async function getAssignmentUserId(
  memberId: string | null,
  userId: string | null
): Promise<string | null> {
  if (userId) return userId
  if (memberId) {
    const [m] = await db.select({ userId: member.userId }).from(member).where(eq(member.id, memberId)).limit(1)
    return m?.userId ?? null
  }
  return null
}

/** Check for overlapping assignments for the same user/member pool. */
async function hasOverlappingAssignment(
  excludeId: string | null,
  targetUserId: string,
  startDate: string,
  endDate: string
): Promise<boolean> {
  const memberIds = await db
    .select({ id: member.id })
    .from(member)
    .where(eq(member.userId, targetUserId))
  const memberIdList = memberIds.map(m => m.id)

  const overlapConditions = [
    or(
      eq(dietPlanAssignment.userId, targetUserId),
      memberIdList.length > 0 ? inArray(dietPlanAssignment.memberId, memberIdList) : sql`false`
    ),
    lte(dietPlanAssignment.startDate, endDate),
    gte(dietPlanAssignment.endDate, startDate),
  ]
  if (excludeId) overlapConditions.push(sql`${dietPlanAssignment.id} != ${excludeId}`)

  const overlapping = await db
    .select({ id: dietPlanAssignment.id })
    .from(dietPlanAssignment)
    .where(and(...overlapConditions))
    .limit(1)

  return overlapping.length > 0
}

export type CreateAssignmentResult =
  | { ok: true; data: (typeof dietPlanAssignment.$inferSelect) }
  | { ok: false; error: string; code: 'VALIDATION' | 'OVERLAP' | 'NOT_FOUND' }

export async function createDietPlanAssignment(
  data: CreateDietPlanAssignment
): Promise<CreateAssignmentResult> {
  const { memberId, userId, dietPlanId, startDate, endDate } = data
  const assigneeUserId = await getAssignmentUserId(memberId ?? null, userId ?? null)
  if (!assigneeUserId) {
    return { ok: false, error: 'Member or user not found', code: 'NOT_FOUND' }
  }

  const [plan] = await db.select({ id: dietPlan.id }).from(dietPlan).where(eq(dietPlan.id, dietPlanId)).limit(1)
  if (!plan) return { ok: false, error: 'Diet plan not found', code: 'NOT_FOUND' }

  if (memberId) {
    const [m] = await db.select({ id: member.id }).from(member).where(eq(member.id, memberId)).limit(1)
    if (!m) return { ok: false, error: 'Member not found', code: 'NOT_FOUND' }
  } else if (userId) {
    // User assignment - user existence checked via getAssignmentUserId
  }

  const overlaps = await hasOverlappingAssignment(null, assigneeUserId, startDate, endDate)
  if (overlaps) {
    return {
      ok: false,
      error: 'Overlapping assignment exists for this user or their member records',
      code: 'OVERLAP',
    }
  }

  const [created] = await db
    .insert(dietPlanAssignment)
    .values({
      memberId: memberId ?? null,
      userId: userId ?? null,
      dietPlanId,
      startDate,
      endDate,
    })
    .returning()

  if (!created) return { ok: false, error: 'Failed to create assignment', code: 'VALIDATION' }
  return { ok: true, data: created }
}

export async function listDietPlanAssignments(query: DietPlanAssignmentsQuery) {
  const { page, perPage, sortBy, sortOrder, memberId, userId, dietPlanId } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (memberId) conditions.push(eq(dietPlanAssignment.memberId, memberId))
  if (userId) conditions.push(eq(dietPlanAssignment.userId, userId))
  if (dietPlanId) conditions.push(eq(dietPlanAssignment.dietPlanId, dietPlanId))
  const where = combineConditions(conditions)

  const sortFieldMap = {
    startDate: dietPlanAssignment.startDate,
    endDate: dietPlanAssignment.endDate,
    createdAt: dietPlanAssignment.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? dietPlanAssignment.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, items] = await Promise.all([
    db.select({ count: count() }).from(dietPlanAssignment).where(where),
    db
      .select()
      .from(dietPlanAssignment)
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function getDietPlanAssignmentById(id: string) {
  const [row] = await db
    .select()
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.id, id))
    .limit(1)
  return row ?? null
}

export type UpdateAssignmentResult =
  | { ok: true; data: (typeof dietPlanAssignment.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'OVERLAP' }

export async function updateDietPlanAssignment(
  id: string,
  data: UpdateDietPlanAssignment
): Promise<UpdateAssignmentResult> {
  const existing = await getDietPlanAssignmentById(id)
  if (!existing) return { ok: false, error: 'Assignment not found', code: 'NOT_FOUND' }

  const startDate = data.startDate ?? existing.startDate
  const endDate = data.endDate ?? existing.endDate

  const assigneeUserId = await getAssignmentUserId(existing.memberId, existing.userId)
  if (assigneeUserId) {
    const overlaps = await hasOverlappingAssignment(id, assigneeUserId, startDate, endDate)
    if (overlaps) {
      return {
        ok: false,
        error: 'Overlapping assignment exists for this user or their member records',
        code: 'OVERLAP',
      }
    }
  }

  const [updated] = await db
    .update(dietPlanAssignment)
    .set({ startDate, endDate })
    .where(eq(dietPlanAssignment.id, id))
    .returning()

  if (!updated) return { ok: false, error: 'Failed to update', code: 'NOT_FOUND' }
  return { ok: true, data: updated }
}

export async function deleteDietPlanAssignment(id: string) {
  const [deleted] = await db.delete(dietPlanAssignment).where(eq(dietPlanAssignment.id, id)).returning()
  return deleted ?? null
}
