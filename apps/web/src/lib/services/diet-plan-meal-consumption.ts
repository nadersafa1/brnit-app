import { db } from '@burn-app/db'
import { dietPlanMealConsumption, dietPlanMeal, meal } from '@burn-app/db/schema'
import { count, asc, desc, eq, and, gte, lte, inArray } from 'drizzle-orm'
import { calculateOffset } from '@/lib/api-helpers/query-builders'
import type {
  CreateDietPlanMealConsumption,
  DietPlanMealConsumptionQuery,
} from '@/types/api/diet-plan-meal-consumption.schemas'

/** Format date to YYYY-MM-DD for consumed_date. */
function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export type LogConsumptionResult =
  | { ok: true; data: (typeof dietPlanMealConsumption.$inferSelect) }
  | { ok: false; error: string; code: 'DUPLICATE' | 'NOT_FOUND' }

export async function logDietPlanMealConsumption(
  data: CreateDietPlanMealConsumption
): Promise<LogConsumptionResult> {
  const consumedAt = data.consumedAt instanceof Date ? data.consumedAt : new Date(data.consumedAt)
  const consumedDate = toDateString(consumedAt)

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

  const [created] = await db
    .insert(dietPlanMealConsumption)
    .values({
      dietPlanAssignmentId: data.dietPlanAssignmentId,
      dietPlanMealId: data.dietPlanMealId,
      consumedAt,
      consumedDate,
    })
    .returning()

  if (!created) return { ok: false, error: 'Failed to log consumption', code: 'NOT_FOUND' }
  return { ok: true, data: created }
}

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

  const [countResult, items] = await Promise.all([
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

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function deleteDietPlanMealConsumption(id: string) {
  const [deleted] = await db
    .delete(dietPlanMealConsumption)
    .where(eq(dietPlanMealConsumption.id, id))
    .returning()
  return deleted ?? null
}
