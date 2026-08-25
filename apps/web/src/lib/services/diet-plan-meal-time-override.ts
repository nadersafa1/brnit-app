import { db } from '@brnit/db'
import { dietPlanMeal, dietPlanMealTimeOverride } from '@brnit/db/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { getTodayUtcDateString } from '@/lib/helpers/date-utc'

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0]

export type MealTimeOverrideInput = {
  dietPlanMealId: string
  scheduledTime: string | null
}

export type MealTimeOverrideRow = {
  dietPlanMealId: string
  scheduledTime: string
  effectiveDate: string | null
}

/**
 * Upserts assignment-level meal time overrides (future-only scope for now).
 * Null scheduledTime removes the future-only override for that meal.
 */
export async function saveAssignmentMealTimeOverrides(
  client: DbClient | typeof db,
  assignmentId: string,
  dietPlanId: string,
  mealTimeOverrides: MealTimeOverrideInput[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (mealTimeOverrides.length === 0) return { ok: true }

  // --- Validate all referenced plan meals belong to assignment's plan ---
  const dietPlanMealIds = [...new Set(mealTimeOverrides.map(item => item.dietPlanMealId))]
  const rows = await client
    .select({ id: dietPlanMeal.id })
    .from(dietPlanMeal)
    .where(and(eq(dietPlanMeal.dietPlanId, dietPlanId), inArray(dietPlanMeal.id, dietPlanMealIds)))
  const existingIds = new Set(rows.map(row => row.id))
  const missing = dietPlanMealIds.filter(id => !existingIds.has(id))
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Diet plan meal(s) not found or do not belong to assignment plan: ${missing.join(', ')}`,
    }
  }

  // --- Replace future-only overrides for the targeted meals atomically ---
  await client
    .delete(dietPlanMealTimeOverride)
    .where(
      and(
        eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId),
        inArray(dietPlanMealTimeOverride.dietPlanMealId, dietPlanMealIds),
        isNull(dietPlanMealTimeOverride.effectiveDate)
      )
    )

  const inserts = mealTimeOverrides.filter(item => item.scheduledTime != null)
  if (inserts.length > 0) {
    await client.insert(dietPlanMealTimeOverride).values(
      inserts.map(item => ({
        dietPlanAssignmentId: assignmentId,
        dietPlanMealId: item.dietPlanMealId,
        scheduledTime: item.scheduledTime as string,
        effectiveDate: null,
      }))
    )
  }

  return { ok: true }
}

export async function getMealTimeOverridesByAssignmentId(assignmentId: string): Promise<MealTimeOverrideRow[]> {
  const rows = await db
    .select({
      dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
      scheduledTime: dietPlanMealTimeOverride.scheduledTime,
      effectiveDate: dietPlanMealTimeOverride.effectiveDate,
    })
    .from(dietPlanMealTimeOverride)
    .where(eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId))

  return rows.map(row => ({
    ...row,
    effectiveDate: row.effectiveDate ?? null,
  }))
}

/**
 * Resolve effective assignment-level times for a date.
 * Prefer exact-date override; otherwise future-only override for today/future dates.
 */
export function resolveMealTimeOverridesForDate(
  overrideRows: MealTimeOverrideRow[],
  resolutionDate: string
): Map<string, string> {
  const today = getTodayUtcDateString()
  const isFutureOrToday = resolutionDate >= today
  const grouped = new Map<string, MealTimeOverrideRow[]>()

  for (const row of overrideRows) {
    const list = grouped.get(row.dietPlanMealId) ?? []
    list.push(row)
    grouped.set(row.dietPlanMealId, list)
  }

  const resolved = new Map<string, string>()
  for (const [dietPlanMealId, rows] of grouped) {
    const exact = rows.find(row => row.effectiveDate === resolutionDate)
    if (exact) {
      resolved.set(dietPlanMealId, exact.scheduledTime)
      continue
    }
    if (isFutureOrToday) {
      const futureOnly = rows.find(row => row.effectiveDate === null)
      if (futureOnly) resolved.set(dietPlanMealId, futureOnly.scheduledTime)
    }
  }
  return resolved
}
