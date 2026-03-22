import { db } from '@burn-app/db'
import {
  dietPlanAssignment,
  dietPlanMeal,
  dietPlanMealItemOverride,
  member,
  mealItem,
  foodItem,
} from '@burn-app/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { getTodayUtcDateString } from '@/lib/helpers/date-utc'
import type { SetDietPlanMealItemOverrideBody } from '@/types/api/diet-plan-meal-item-override.schemas'

type AssignmentForUser = { id: string; dietPlanId: string }

/**
 * Builds a Drizzle condition for effectiveDate: null (future-only) or exact date.
 * Used by upsert and delete to target the correct override row.
 */
function buildEffectiveDateCondition(effectiveDate: string | null) {
  return effectiveDate === null
    ? isNull(dietPlanMealItemOverride.effectiveDate)
    : eq(dietPlanMealItemOverride.effectiveDate, effectiveDate)
}

/**
 * Resolves whether the current user can access this assignment (direct userId or via member).
 */
async function getAssignmentForUser(userId: string, assignmentId: string): Promise<AssignmentForUser | null> {
  const [memberRows, [row]] = await Promise.all([
    db.select({ id: member.id }).from(member).where(eq(member.userId, userId)),
    db
      .select({
        id: dietPlanAssignment.id,
        userId: dietPlanAssignment.userId,
        memberId: dietPlanAssignment.memberId,
        dietPlanId: dietPlanAssignment.dietPlanId,
      })
      .from(dietPlanAssignment)
      .where(eq(dietPlanAssignment.id, assignmentId))
      .limit(1),
  ])
  const memberIdList = memberRows.map(m => m.id)

  if (!row) return null
  if (row.userId === userId) return { id: row.id, dietPlanId: row.dietPlanId }
  if (row.memberId && memberIdList.includes(row.memberId)) {
    return { id: row.id, dietPlanId: row.dietPlanId }
  }
  return null
}

export type UpsertOverrideResult =
  | { ok: true; data: typeof dietPlanMealItemOverride.$inferSelect; created: boolean }
  | {
      ok: false
      error: string
      code: 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION'
    }

/**
 * Upserts a meal-item override for the given scope (single date or future-only).
 * When body.date is set, override applies only that day; when omitted, applies from today onward.
 */
export async function upsertMealItemOverride(
  userId: string,
  assignmentId: string,
  dietPlanMealId: string,
  mealItemId: string,
  body: SetDietPlanMealItemOverrideBody
): Promise<UpsertOverrideResult> {
  const assignment = await getAssignmentForUser(userId, assignmentId)
  if (!assignment) {
    return { ok: false, error: 'Assignment not found or access denied', code: 'FORBIDDEN' }
  }

  // Validate diet plan meal, meal item, and food item (dpm + food in parallel; mi needs dpm.mealId).
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
  const [food] = foodRows
  if (!food) {
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

  const effectiveDate = body.date ?? null
  const effectiveDateCondition = buildEffectiveDateCondition(effectiveDate)

  // Atomic read-then-write: avoid race where concurrent request inserts same scope.
  const result = await db.transaction(async tx => {
    const [existing] = await tx
      .select()
      .from(dietPlanMealItemOverride)
      .where(
        and(
          eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
          eq(dietPlanMealItemOverride.dietPlanMealId, dietPlanMealId),
          eq(dietPlanMealItemOverride.mealItemId, mealItemId),
          effectiveDateCondition
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await tx
        .update(dietPlanMealItemOverride)
        .set({
          foodItemId: body.foodItemId,
          quantity: String(body.quantity),
        })
        .where(eq(dietPlanMealItemOverride.id, existing.id))
        .returning()
      return updated ? { data: updated, created: false } : null
    }

    const [created] = await tx
      .insert(dietPlanMealItemOverride)
      .values({
        dietPlanAssignmentId: assignmentId,
        dietPlanMealId,
        mealItemId,
        foodItemId: body.foodItemId,
        quantity: String(body.quantity),
        effectiveDate,
      })
      .returning()
    return created ? { data: created, created: true } : null
  })

  if (!result) {
    return { ok: false, error: 'Failed to save override', code: 'VALIDATION' }
  }
  return { ok: true, data: result.data, created: result.created }
}

export type DeleteOverrideResult = { ok: true } | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' }

/**
 * Deletes the override for the given scope. When date is set, deletes that date's override;
 * when omitted, deletes the future-only override (effectiveDate IS NULL).
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

  const effectiveDate = date ?? null
  const effectiveDateCondition = buildEffectiveDateCondition(effectiveDate)

  const [deleted] = await db
    .delete(dietPlanMealItemOverride)
    .where(
      and(
        eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
        eq(dietPlanMealItemOverride.dietPlanMealId, dietPlanMealId),
        eq(dietPlanMealItemOverride.mealItemId, mealItemId),
        effectiveDateCondition
      )
    )
    .returning({ id: dietPlanMealItemOverride.id })
  return deleted ? { ok: true } : { ok: false, error: 'Override not found', code: 'NOT_FOUND' }
}

export type GetDisplayedFoodResult =
  | { ok: true; foodItemId: string; quantity: number }
  | { ok: false; error: string; code: 'FORBIDDEN' | 'NOT_FOUND' }

/**
 * Returns the food and quantity to display for a meal item on a given date.
 * Uses override when one applies (exact-date or future-only); otherwise plan default.
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

  const [dpm] = await db
    .select({ id: dietPlanMeal.id, mealId: dietPlanMeal.mealId })
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

  const date = resolutionDate ?? getTodayUtcDateString()
  const [miRows, overrides] = await Promise.all([
    db
      .select({ foodItemId: mealItem.foodItemId, quantity: mealItem.quantity })
      .from(mealItem)
      .where(and(eq(mealItem.id, mealItemId), eq(mealItem.mealId, dpm.mealId)))
      .limit(1),
    getOverridesByAssignmentId(assignmentId),
  ])
  const [mi] = miRows
  if (!mi) {
    return {
      ok: false,
      error: 'Meal item not found or does not belong to this diet plan meal',
      code: 'NOT_FOUND',
    }
  }

  const resolved = resolveOverridesForDate(overrides, date)
  const override = resolved.get(`${dietPlanMealId}:${mealItemId}`)
  if (override) {
    return {
      ok: true,
      foodItemId: override.foodItemId,
      quantity: Number(override.quantity),
    }
  }
  return {
    ok: true,
    foodItemId: mi.foodItemId,
    quantity: Number(mi.quantity),
  }
}

export type OverrideRow = {
  dietPlanMealId: string
  mealItemId: string
  foodItemId: string
  foodName: string
  quantity: string
  /** NULL = future only; non-null = that date only. */
  effectiveDate: string | null
}

/** Fetches all override rows for an assignment (used by consumers to resolve per date). */
export async function getOverridesByAssignmentId(assignmentId: string): Promise<OverrideRow[]> {
  const rows = await db.query.dietPlanMealItemOverride.findMany({
    where: eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
    columns: {
      dietPlanMealId: true,
      mealItemId: true,
      foodItemId: true,
      quantity: true,
      effectiveDate: true,
    },
    with: {
      foodItem: {
        columns: { name: true },
      },
    },
  })
  return rows.map(r => ({
    dietPlanMealId: r.dietPlanMealId,
    mealItemId: r.mealItemId,
    foodItemId: r.foodItemId,
    foodName: r.foodItem.name,
    quantity: r.quantity,
    effectiveDate: r.effectiveDate ?? null,
  }))
}

/**
 * Resolve which overrides apply for a given date.
 * Prefer override with effectiveDate = date; else effectiveDate null and date >= today; else no override.
 */
export function resolveOverridesForDate(overrideRows: OverrideRow[], resolutionDate: string): Map<string, OverrideRow> {
  const today = getTodayUtcDateString()
  const isFutureOrToday = resolutionDate >= today

  const byKey = new Map<string, OverrideRow[]>()
  for (const row of overrideRows) {
    const key = `${row.dietPlanMealId}:${row.mealItemId}`
    const list = byKey.get(key) ?? []
    list.push(row)
    byKey.set(key, list)
  }

  const result = new Map<string, OverrideRow>()
  for (const [key, rows] of byKey) {
    const exact = rows.find(r => r.effectiveDate === resolutionDate)
    if (exact) {
      result.set(key, exact)
      continue
    }
    if (isFutureOrToday) {
      const futureOnly = rows.find(r => r.effectiveDate === null)
      if (futureOnly) result.set(key, futureOnly)
    }
  }
  return result
}
