import { db } from '@burn-app/db'
import {
  dietPlanAssignment,
  dietPlanMeal,
  dietPlanMealItemOverride,
  member,
  mealItem,
  foodItem,
} from '@burn-app/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import { addDaysUTC, getTodayUtcDateString, maxDateString } from '@/lib/helpers/date-utc'
import type { SetDietPlanMealItemOverrideBody } from '@/types/api/diet-plan-meal-item-override.schemas'

type AssignmentForUser = { id: string; dietPlanId: string; endDate: string }
type OverrideScope = 'single_day' | 'rest_of_plan'
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505'

type NormalizedScopeWindow = {
  scope: OverrideScope
  startDate: string
}

type OverrideSlotKey = {
  assignmentId: string
  dietPlanMealId: string
  mealItemId: string
}

/**
 * Convert request scope input into a normalized window.
 * rest_of_plan start is clamped to today (UTC) to avoid backdating.
 */
function normalizeScopeWindow(body: SetDietPlanMealItemOverrideBody, todayUtcDate: string): NormalizedScopeWindow {
  if (body.scope === 'single_day') {
    return {
      scope: 'single_day',
      startDate: body.startDate,
    }
  }

  return {
    scope: 'rest_of_plan',
    startDate: maxDateString(body.startDate, todayUtcDate),
  }
}

/** Expand an inclusive YYYY-MM-DD range into ordered date strings. */
function expandDateRangeInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  let cursor = startDate
  while (cursor <= endDate) {
    dates.push(cursor)
    cursor = addDaysUTC(cursor, 1)
  }
  return dates
}

/** Ensure date arrays are unique and lexicographically sorted (YYYY-MM-DD). */
function dedupeAndSortDateStrings(dateStrings: string[]): string[] {
  return [...new Set(dateStrings)].sort((a, b) => a.localeCompare(b))
}

function parseEffectiveDates(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return dedupeAndSortDateStrings(value.filter((entry): entry is string => typeof entry === 'string'))
}

function isUniqueViolationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error && typeof error.code === 'string' ? error.code : undefined
  if (code === POSTGRES_UNIQUE_VIOLATION_CODE) return true
  const cause =
    'cause' in error && error.cause && typeof error.cause === 'object' ? (error.cause as { code?: string }) : null
  return cause?.code === POSTGRES_UNIQUE_VIOLATION_CODE
}

function buildOverrideSlotCondition(slot: OverrideSlotKey) {
  return and(
    eq(dietPlanMealItemOverride.dietPlanAssignmentId, slot.assignmentId),
    eq(dietPlanMealItemOverride.dietPlanMealId, slot.dietPlanMealId),
    eq(dietPlanMealItemOverride.mealItemId, slot.mealItemId),
  )
}

function buildEffectiveDateContainsCondition(targetDate: string) {
  return sql`${dietPlanMealItemOverride.effectiveDates} @> ${JSON.stringify([targetDate])}::jsonb`
}

/**
 * Build canonical effective dates from scope + assignment boundary.
 * rest_of_plan snapshot: startDate through assignment.endDate at write time.
 */
function buildEffectiveDateSetFromScope(scopeWindow: NormalizedScopeWindow, assignmentEndDate: string): string[] {
  if (scopeWindow.scope === 'single_day') {
    return [scopeWindow.startDate]
  }
  if (scopeWindow.startDate > assignmentEndDate) {
    return []
  }
  return expandDateRangeInclusive(scopeWindow.startDate, assignmentEndDate)
}

/** Resolve user access to assignment (direct user or linked member). */
async function getAssignmentForUser(userId: string, assignmentId: string): Promise<AssignmentForUser | null> {
  const [memberRows, [row]] = await Promise.all([
    db.select({ id: member.id }).from(member).where(eq(member.userId, userId)),
    db
      .select({
        id: dietPlanAssignment.id,
        userId: dietPlanAssignment.userId,
        memberId: dietPlanAssignment.memberId,
        dietPlanId: dietPlanAssignment.dietPlanId,
        endDate: dietPlanAssignment.endDate,
      })
      .from(dietPlanAssignment)
      .where(eq(dietPlanAssignment.id, assignmentId))
      .limit(1),
  ])
  const memberIdSet = new Set(memberRows.map(m => m.id))
  if (!row) return null
  if (row.userId === userId) return { id: row.id, dietPlanId: row.dietPlanId, endDate: row.endDate }
  if (row.memberId && memberIdSet.has(row.memberId)) {
    return { id: row.id, dietPlanId: row.dietPlanId, endDate: row.endDate }
  }
  return null
}

export type UpsertOverrideResult =
  | { ok: true; data: typeof dietPlanMealItemOverride.$inferSelect; created: boolean }
  | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' }

/**
 * Upsert override by slot + food item.
 * This allows multiple rows per slot (different foods), while each food has one mutable date set.
 */
export async function upsertMealItemOverride(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  body: SetDietPlanMealItemOverrideBody
): Promise<UpsertOverrideResult> {
  // 1) Authorize assignment access before validating slot entities.
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }

  // 2) Validate independent entities in parallel to avoid request waterfalls.
  const [dpmRows, foodRows] = await Promise.all([
    db
      .select({ id: dietPlanMeal.id, mealId: dietPlanMeal.mealId })
      .from(dietPlanMeal)
      .where(and(eq(dietPlanMeal.id, dietPlanMealId), eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)))
      .limit(1),
    db.select({ id: foodItem.id }).from(foodItem).where(eq(foodItem.id, body.foodItemId)).limit(1),
  ])
  const [dpm] = dpmRows
  if (!dpm) {
    return {
      ok: false,
      error: 'Diet plan meal not found or does not belong to this assignment',
      code: 'NOT_FOUND',
    }
  }
  if (!foodRows[0]) {
    return { ok: false, error: 'Food item not found', code: 'VALIDATION' }
  }

  const [mi] = await db
    .select({ id: mealItem.id })
    .from(mealItem)
    .where(and(eq(mealItem.id, mealItemId), eq(mealItem.mealId, dpm.mealId)))
    .limit(1)
  if (!mi) {
    return {
      ok: false,
      error: 'Meal item not found or does not belong to this diet plan meal',
      code: 'NOT_FOUND',
    }
  }

  // 3) Normalize caller scope into canonical effective dates within assignment boundaries.
  const scopeWindow = normalizeScopeWindow(body, getTodayUtcDateString())
  const effectiveDates = dedupeAndSortDateStrings(
    buildEffectiveDateSetFromScope(scopeWindow, assignment.endDate)
  )
  if (effectiveDates.length === 0) {
    return {
      ok: false,
      error: 'No effective dates in assignment range',
      code: 'VALIDATION',
    }
  }

  // 4) Atomic upsert keeps read/merge/write consistent under concurrent updates.
  let result:
    | { kind: 'MISSING_OVERRIDE' }
    | { kind: 'FAILED' }
    | { kind: 'SUCCESS'; data: typeof dietPlanMealItemOverride.$inferSelect; created: boolean }
  try {
    result = await db.transaction(async tx => {
      const slotCondition = buildOverrideSlotCondition({
        assignmentId,
        dietPlanMealId,
        mealItemId,
      })

      // If caller provides overrideId, update that concrete record in this slot.
      if (body.overrideId) {
        const [existingById] = await tx
          .select()
          .from(dietPlanMealItemOverride)
          .where(and(slotCondition, eq(dietPlanMealItemOverride.id, body.overrideId)))
          .limit(1)

        if (!existingById) {
          return { kind: 'MISSING_OVERRIDE' as const }
        }

        const [updatedById] = await tx
          .update(dietPlanMealItemOverride)
          .set({
            foodItemId: body.foodItemId,
            quantity: String(body.quantity),
            intentScope: scopeWindow.scope,
            intentStartDate: scopeWindow.startDate,
            effectiveDates,
          })
          .where(eq(dietPlanMealItemOverride.id, existingById.id))
          .returning()

        return updatedById
          ? { kind: 'SUCCESS' as const, data: updatedById, created: false }
          : { kind: 'FAILED' as const }
      }

      // Otherwise, upsert by slot+food. Existing rows merge date sets to avoid clobbering prior days.
      const [existing] = await tx
        .select()
        .from(dietPlanMealItemOverride)
        .where(
          and(
            slotCondition,
            eq(dietPlanMealItemOverride.foodItemId, body.foodItemId),
          )
        )
        .limit(1)

      if (existing) {
        const mergedEffectiveDates = dedupeAndSortDateStrings([
          ...parseEffectiveDates(existing.effectiveDates),
          ...effectiveDates,
        ])
        const [updated] = await tx
          .update(dietPlanMealItemOverride)
          .set({
            quantity: String(body.quantity),
            intentScope: scopeWindow.scope,
            intentStartDate: scopeWindow.startDate,
            effectiveDates: mergedEffectiveDates,
          })
          .where(eq(dietPlanMealItemOverride.id, existing.id))
          .returning()
        return updated
          ? { kind: 'SUCCESS' as const, data: updated, created: false }
          : { kind: 'FAILED' as const }
      }

      const [created] = await tx
        .insert(dietPlanMealItemOverride)
        .values({
          dietPlanAssignmentId: assignmentId,
          dietPlanMealId,
          mealItemId,
          foodItemId: body.foodItemId,
          quantity: String(body.quantity),
          intentScope: scopeWindow.scope,
          intentStartDate: scopeWindow.startDate,
          effectiveDates,
        })
        .returning()
      return created
        ? { kind: 'SUCCESS' as const, data: created, created: true }
        : { kind: 'FAILED' as const }
    })
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return { ok: false, error: 'Override conflicts with an existing item override', code: 'VALIDATION' }
    }
    throw error
  }

  if (result.kind === 'MISSING_OVERRIDE') {
    return { ok: false, error: 'Override not found', code: 'NOT_FOUND' }
  }
  if (result.kind !== 'SUCCESS') {
    return { ok: false, error: 'Failed to save override', code: 'VALIDATION' }
  }
  return { ok: true, data: result.data, created: result.created }
}

export type DeleteOverrideResult = { ok: true } | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' }

type OverrideDeleteCandidate = {
  id: string
  effectiveDates: string[] | null
}

/**
 * Delete coverage from override rows in a slot.
 * - with date: edits the latest row that applies on that date
 * - without date: removes all override rows in the slot
 */
export async function deleteMealItemOverride(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  date?: string
): Promise<DeleteOverrideResult> {
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }

  const [dpm] = await db
    .select({ id: dietPlanMeal.id })
    .from(dietPlanMeal)
    .where(and(eq(dietPlanMeal.id, dietPlanMealId), eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)))
    .limit(1)
  if (!dpm) {
    return {
      ok: false,
      error: 'Diet plan meal not found or does not belong to this assignment',
      code: 'NOT_FOUND',
    }
  }

  if (typeof date !== 'string') {
    const deletedRows = await db
      .delete(dietPlanMealItemOverride)
      .where(buildOverrideSlotCondition({ assignmentId, dietPlanMealId, mealItemId }))
      .returning({ id: dietPlanMealItemOverride.id })
    return deletedRows.length > 0
      ? { ok: true }
      : { ok: false, error: 'Override not found', code: 'NOT_FOUND' }
  }

  const deleteDateResult = await db.transaction(async tx => {
    // Read-then-update/delete must be atomic to avoid races with concurrent edits.
    const existingRows = (await tx
      .select({
        id: dietPlanMealItemOverride.id,
        effectiveDates: dietPlanMealItemOverride.effectiveDates,
      })
      .from(dietPlanMealItemOverride)
      .where(buildOverrideSlotCondition({ assignmentId, dietPlanMealId, mealItemId }))
      .orderBy(desc(dietPlanMealItemOverride.updatedAt))) as OverrideDeleteCandidate[]

    const existing = existingRows.find(row => parseEffectiveDates(row.effectiveDates).includes(date))
    if (!existing) {
      return { ok: false, error: 'Override not found', code: 'NOT_FOUND' as const }
    }

    const currentDates = parseEffectiveDates(existing.effectiveDates)
    const nextDates = currentDates.filter(d => d !== date)
    if (nextDates.length === currentDates.length) {
      return { ok: false, error: 'Override not found', code: 'NOT_FOUND' as const }
    }

    if (nextDates.length === 0) {
      await tx.delete(dietPlanMealItemOverride).where(eq(dietPlanMealItemOverride.id, existing.id))
      return { ok: true as const }
    }

    await tx
      .update(dietPlanMealItemOverride)
      .set({ effectiveDates: nextDates })
      .where(eq(dietPlanMealItemOverride.id, existing.id))
    return { ok: true as const }
  })

  return deleteDateResult
}

export type GetDisplayedFoodResult =
  | { ok: true; foodItemId: string; quantity: number }
  | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' }

/**
 * Resolve display food+quantity for a slot on a date.
 * Slot override applies when resolutionDate is present in row.effectiveDates.
 */
export async function getDisplayedFoodAndQuantityForMealItem(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  resolutionDate?: string
): Promise<GetDisplayedFoodResult> {
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }
  const resolutionDateValue = resolutionDate ?? getTodayUtcDateString()

  const [[dpm], [latestOverride]] = await Promise.all([
    db
      .select({ id: dietPlanMeal.id, mealId: dietPlanMeal.mealId })
      .from(dietPlanMeal)
      .where(and(eq(dietPlanMeal.id, dietPlanMealId), eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)))
      .limit(1),
    db
      .select({
        foodItemId: dietPlanMealItemOverride.foodItemId,
        quantity: dietPlanMealItemOverride.quantity,
      })
      .from(dietPlanMealItemOverride)
      .where(
        and(
          buildOverrideSlotCondition({
            assignmentId,
            dietPlanMealId,
            mealItemId,
          }),
          buildEffectiveDateContainsCondition(resolutionDateValue),
        )
      )
      .orderBy(desc(dietPlanMealItemOverride.updatedAt))
      .limit(1),
  ])
  if (!dpm) {
    return {
      ok: false,
      error: 'Diet plan meal not found or does not belong to this assignment',
      code: 'NOT_FOUND',
    }
  }

  const [mi] = await db
    .select({ foodItemId: mealItem.foodItemId, quantity: mealItem.quantity })
    .from(mealItem)
    .where(and(eq(mealItem.id, mealItemId), eq(mealItem.mealId, dpm.mealId)))
    .limit(1)
  if (!mi) {
    return {
      ok: false,
      error: 'Meal item not found or does not belong to this diet plan meal',
      code: 'NOT_FOUND',
    }
  }

  if (latestOverride) {
    return { ok: true, foodItemId: latestOverride.foodItemId, quantity: Number(latestOverride.quantity) }
  }

  return { ok: true, foodItemId: mi.foodItemId, quantity: Number(mi.quantity) }
}

export type OverrideRow = {
  dietPlanMealId: string
  mealItemId: string
  foodItemId: string
  foodName: string
  quantity: string
  effectiveDates: string[]
  updatedAt: Date
}

/** Fetch all override rows for an assignment. */
export async function getOverridesByAssignmentId(assignmentId: string): Promise<OverrideRow[]> {
  const rows = await db.query.dietPlanMealItemOverride.findMany({
    where: eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
    columns: {
      dietPlanMealId: true,
      mealItemId: true,
      foodItemId: true,
      quantity: true,
      effectiveDates: true,
      updatedAt: true,
    },
    with: {
      foodItem: {
        columns: { name: true },
      },
    },
  })
  return rows.map(row => ({
    dietPlanMealId: row.dietPlanMealId,
    mealItemId: row.mealItemId,
    foodItemId: row.foodItemId,
    foodName: row.foodItem.name,
    quantity: row.quantity,
    effectiveDates: parseEffectiveDates(row.effectiveDates),
    updatedAt: row.updatedAt,
  }))
}

/**
 * Resolve applicable rows for a date.
 * Multiple rows per slot are supported; latest update wins when date coverage overlaps.
 */
export function resolveOverridesForDate(overrideRows: OverrideRow[], resolutionDate: string): Map<string, OverrideRow> {
  const resolved = new Map<string, OverrideRow>()
  for (const row of overrideRows) {
    const slotKey = `${row.dietPlanMealId}:${row.mealItemId}`
    if (!row.effectiveDates.includes(resolutionDate)) continue
    const current = resolved.get(slotKey)
    if (!current || row.updatedAt.getTime() > current.updatedAt.getTime()) {
      resolved.set(slotKey, row)
    }
  }
  return resolved
}
