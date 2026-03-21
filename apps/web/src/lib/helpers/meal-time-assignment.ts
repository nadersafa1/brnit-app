/**
 * Helpers for nutritionist UI: assignment-level meal times vs plan defaults.
 * API only persists rows that differ from the plan (or explicit null to clear override).
 */

export type PlanMealWithOptionalTime = {
  id: string
  scheduledTime?: string | null
}

export type AssignmentMealTimeOverrideRow = {
  dietPlanMealId: string
  scheduledTime: string
}

export type MealTimeOverridePayload = {
  dietPlanMealId: string
  scheduledTime: string | null
}

/**
 * Build the payload for create/update: one entry per meal where the UI value
 * differs from the plan default (empty string means "use plan default" → omitted unless default was set).
 */
export function buildMealTimeOverridesPayload(
  planMeals: PlanMealWithOptionalTime[],
  mealTimesByMealId: Record<string, string>
): MealTimeOverridePayload[] {
  return planMeals
    .map((meal) => {
      const raw = mealTimesByMealId[meal.id] ?? ''
      const normalizedCurrent = raw === '' ? null : raw
      const normalizedDefault = meal.scheduledTime ?? null
      if (normalizedCurrent === normalizedDefault) return null
      return {
        dietPlanMealId: meal.id,
        scheduledTime: normalizedCurrent,
      }
    })
    .filter((item): item is MealTimeOverridePayload => item !== null)
}

/**
 * Initial `<input type="time">` values when editing: assignment overrides win, else plan default.
 */
export function mealTimeFieldMapFromPlanAndOverrides(
  planMeals: PlanMealWithOptionalTime[],
  assignmentOverrides: AssignmentMealTimeOverrideRow[]
): Record<string, string> {
  const next: Record<string, string> = {}
  const overrideMap = new Map(assignmentOverrides.map((item) => [item.dietPlanMealId, item.scheduledTime]))
  for (const meal of planMeals) {
    next[meal.id] = overrideMap.get(meal.id) ?? meal.scheduledTime ?? ''
  }
  return next
}
