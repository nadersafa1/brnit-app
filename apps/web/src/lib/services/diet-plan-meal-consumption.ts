import { db } from '@burn-app/db'
import {
  dietPlanAssignment,
  dietPlanMealConsumption,
  dietPlanMealConsumptionItem,
  dietPlanMeal,
  meal,
  foodItem,
} from '@burn-app/db/schema'
import { count, asc, desc, eq, and, gte, lte, inArray } from 'drizzle-orm'
import { calculateOffset } from '@/lib/api-helpers/query-builders'
import { getMaxConsumptionPastDays } from '@/lib/config/consumption-window'
import { getDietPlanById } from '@/lib/services/diet-plans'
import { getOverridesByAssignmentId, resolveOverridesForDate } from '@/lib/services/diet-plan-meal-item-override'
import type {
  CreateDietPlanMealConsumption,
  DietPlanMealConsumptionQuery,
} from '@/types/api/diet-plan-meal-consumption.schemas'

/** Format date to YYYY-MM-DD for consumed_date. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDaysToDateString(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export type LogConsumptionResult =
  | { ok: true; data: typeof dietPlanMealConsumption.$inferSelect }
  | {
      ok: false
      error: string
      code: 'DUPLICATE' | 'NOT_FOUND' | 'INVALID_CONSUMED_ITEMS' | 'INVALID_SLOT' | 'OUT_OF_ALLOWED_DATE_RANGE'
    }

/**
 * Resolves plan items for one meal slot on a given date, applying date-scoped overrides.
 * Returns items to log (foodItemId + quantity) or null if assignment/slot invalid.
 */
async function resolvePlannedItemsForSlot(
  assignmentId: string,
  dietPlanMealId: string,
  consumedDate: string
): Promise<Array<{ foodItemId: string; quantity: number }> | null> {
  const [assign] = await db
    .select({ dietPlanId: dietPlanAssignment.dietPlanId })
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.id, assignmentId))
    .limit(1)
  if (!assign) return null

  const [plan, overrides] = await Promise.all([
    getDietPlanById(assign.dietPlanId),
    getOverridesByAssignmentId(assignmentId),
  ])
  if (!plan) return null

  const dpm = plan.dietPlanMeals?.find(pm => pm.id === dietPlanMealId)
  if (!dpm?.mealItems?.length) return null

  const resolved = resolveOverridesForDate(overrides, consumedDate)
  const overrideMap = new Map<string, { foodItemId: string; quantity: number }>()
  for (const [key, row] of resolved) {
    overrideMap.set(key, {
      foodItemId: row.foodItemId,
      quantity: Number(row.quantity),
    })
  }

  return dpm.mealItems.map(item => {
    const ov = overrideMap.get(`${dietPlanMealId}:${item.mealItemId}`)
    return ov ?? { foodItemId: item.foodItemId, quantity: item.quantity }
  })
}

/**
 * Logs a diet plan meal consumption. If usePlannedItems is true and no items provided,
 * resolves planned items (plan + date-scoped overrides) for the consumption date.
 * Insert of consumption + consumption items is done in a transaction for atomicity.
 */
export async function logDietPlanMealConsumption(data: CreateDietPlanMealConsumption): Promise<LogConsumptionResult> {
  let consumedItems = data.consumedItems?.filter(
    (item): item is { foodItemId: string; quantity: number } => typeof item.quantity === 'number' && item.quantity > 0
  )

  const consumedAt = data.consumedAt instanceof Date ? data.consumedAt : new Date(data.consumedAt)
  const consumedDate = toDateString(consumedAt)
  const maxPastDays = getMaxConsumptionPastDays()
  const today = toDateString(new Date())
  const minAllowedDate = addDaysToDateString(today, -maxPastDays)

  // Guardrail: reject future dates and dates older than allowed backdate window.
  if (consumedDate > today || consumedDate < minAllowedDate) {
    return {
      ok: false,
      error: `consumedAt must be between ${minAllowedDate} and ${today}`,
      code: 'OUT_OF_ALLOWED_DATE_RANGE',
    }
  }

  // Resolve planned items from plan + overrides when client requests meal-level consumption only.
  if (data.usePlannedItems && (!consumedItems || consumedItems.length === 0)) {
    const resolved = await resolvePlannedItemsForSlot(data.dietPlanAssignmentId, data.dietPlanMealId, consumedDate)
    if (resolved === null) {
      return {
        ok: false,
        error: 'Diet plan meal not found or does not belong to this assignment',
        code: 'INVALID_SLOT',
      }
    }
    consumedItems = resolved
  }

  // Prevent duplicate consumption for the same slot and date.
  const [existing] = await db
    .select({ id: dietPlanMealConsumption.id })
    .from(dietPlanMealConsumption)
    .where(
      and(
        eq(dietPlanMealConsumption.dietPlanAssignmentId, data.dietPlanAssignmentId),
        eq(dietPlanMealConsumption.dietPlanMealId, data.dietPlanMealId),
        eq(dietPlanMealConsumption.consumedDate, consumedDate)
      )
    )
    .limit(1)

  if (existing) {
    return {
      ok: false,
      error: 'Consumption already logged for this slot on this date',
      code: 'DUPLICATE',
    }
  }

  // Validate referenced food items exist before starting the transaction (read-only check).
  if (consumedItems && consumedItems.length > 0) {
    const foodItemIds = [...new Set(consumedItems.map(i => i.foodItemId))]
    const existingFoodItems = await db.select({ id: foodItem.id }).from(foodItem).where(inArray(foodItem.id, foodItemIds))
    const existingIds = new Set(existingFoodItems.map(r => r.id))
    const missing = foodItemIds.filter(id => !existingIds.has(id))
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Food item(s) not found: ${missing.join(', ')}`,
        code: 'INVALID_CONSUMED_ITEMS',
      }
    }
  }

  // Atomic insert: consumption row + consumption items. Rollback on any failure.
  const created = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(dietPlanMealConsumption)
      .values({
        dietPlanAssignmentId: data.dietPlanAssignmentId,
        dietPlanMealId: data.dietPlanMealId,
        consumedAt,
        consumedDate,
      })
      .returning()

    if (!inserted) return null

    if (consumedItems && consumedItems.length > 0) {
      await tx.insert(dietPlanMealConsumptionItem).values(
        consumedItems.map((item) => ({
          dietPlanMealConsumptionId: inserted.id,
          foodItemId: item.foodItemId,
          quantity: String(item.quantity),
        }))
      )
    }

    return inserted
  })

  if (!created) return { ok: false, error: 'Failed to log consumption', code: 'NOT_FOUND' }
  return { ok: true, data: created }
}

/**
 * Lists diet plan meal consumptions with optional filters and pagination.
 * Fetches count and rows in parallel; then fetches consumption items for the returned rows.
 */
export async function listDietPlanMealConsumptions(query: DietPlanMealConsumptionQuery) {
  const {
    page,
    perPage,
    sortBy,
    sortOrder,
    dietPlanAssignmentId,
    dietPlanAssignmentIds,
    consumedDateFrom,
    consumedDateTo,
  } = query
  const offset = calculateOffset(page, perPage)

  // Build filter conditions from query (assignment and date range).
  const conditions: Parameters<typeof and>[0][] = []
  if (dietPlanAssignmentId) {
    conditions.push(eq(dietPlanMealConsumption.dietPlanAssignmentId, dietPlanAssignmentId))
  } else if (dietPlanAssignmentIds && dietPlanAssignmentIds.length > 0) {
    conditions.push(inArray(dietPlanMealConsumption.dietPlanAssignmentId, dietPlanAssignmentIds))
  }
  if (consumedDateFrom) {
    conditions.push(gte(dietPlanMealConsumption.consumedDate, consumedDateFrom))
  }
  if (consumedDateTo) {
    conditions.push(lte(dietPlanMealConsumption.consumedDate, consumedDateTo))
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const sortFieldMap = {
    consumedAt: dietPlanMealConsumption.consumedAt,
    consumedDate: dietPlanMealConsumption.consumedDate,
    createdAt: dietPlanMealConsumption.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'consumedAt'] ?? dietPlanMealConsumption.consumedAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  // Count and paginated rows are independent; run in parallel.
  const [countResult, rows] = await Promise.all([
    db.select({ count: count() }).from(dietPlanMealConsumption).where(where),
    db
      .select({
        id: dietPlanMealConsumption.id,
        dietPlanAssignmentId: dietPlanMealConsumption.dietPlanAssignmentId,
        dietPlanMealId: dietPlanMealConsumption.dietPlanMealId,
        consumedAt: dietPlanMealConsumption.consumedAt,
        consumedDate: dietPlanMealConsumption.consumedDate,
        createdAt: dietPlanMealConsumption.createdAt,
        mealName: meal.name,
      })
      .from(dietPlanMealConsumption)
      .innerJoin(dietPlanMeal, eq(dietPlanMealConsumption.dietPlanMealId, dietPlanMeal.id))
      .innerJoin(meal, eq(dietPlanMeal.mealId, meal.id))
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  // Fetch consumption items for this page of consumptions (single batch query).
  const consumptionIds = rows.map((r) => r.id)
  const consumedItemsByConsumption =
    consumptionIds.length > 0
      ? await db
          .select({
            dietPlanMealConsumptionId: dietPlanMealConsumptionItem.dietPlanMealConsumptionId,
            foodItemId: dietPlanMealConsumptionItem.foodItemId,
            quantity: dietPlanMealConsumptionItem.quantity,
            foodName: foodItem.name,
          })
          .from(dietPlanMealConsumptionItem)
          .innerJoin(foodItem, eq(dietPlanMealConsumptionItem.foodItemId, foodItem.id))
          .where(inArray(dietPlanMealConsumptionItem.dietPlanMealConsumptionId, consumptionIds))
      : []

  // Group consumption items by consumption id for attachment to each row.
  const itemsMap = new Map<string, Array<{ foodItemId: string; quantity: number; foodName: string }>>()
  for (const row of consumedItemsByConsumption) {
    const list = itemsMap.get(row.dietPlanMealConsumptionId) ?? []
    list.push({
      foodItemId: row.foodItemId,
      quantity: Number(row.quantity),
      foodName: row.foodName,
    })
    itemsMap.set(row.dietPlanMealConsumptionId, list)
  }

  const items = rows.map((row) => ({
    ...row,
    consumedItems: itemsMap.get(row.id) ?? [],
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/** Deletes a single consumption by id. Consumption items are removed by DB cascade. */
export async function deleteDietPlanMealConsumption(id: string) {
  const [deleted] = await db.delete(dietPlanMealConsumption).where(eq(dietPlanMealConsumption.id, id)).returning()
  return deleted ?? null
}

/**
 * Deletes the consumption for a given assignment + meal + date (member unmark flow).
 * Finds the row by composite key then deletes by id; cascade removes consumption items.
 * Returns the deleted row or null if not found.
 */
export async function deleteDietPlanMealConsumptionBySlot(
  assignmentId: string,
  dietPlanMealId: string,
  consumedDate: string
) {
  const [row] = await db
    .select({ id: dietPlanMealConsumption.id })
    .from(dietPlanMealConsumption)
    .where(
      and(
        eq(dietPlanMealConsumption.dietPlanAssignmentId, assignmentId),
        eq(dietPlanMealConsumption.dietPlanMealId, dietPlanMealId),
        eq(dietPlanMealConsumption.consumedDate, consumedDate)
      )
    )
    .limit(1)

  if (!row) return null

  const [deleted] = await db.delete(dietPlanMealConsumption).where(eq(dietPlanMealConsumption.id, row.id)).returning()
  return deleted ?? null
}
