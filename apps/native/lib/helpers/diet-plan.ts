/**
 * Helpers for resolving and aggregating diet plan data by date.
 * Macros are not rounded here; callers should use roundUpToTenth for display.
 */

import type { CurrentDietPlanDay, CurrentDietPlanMeal, CurrentDietPlanResponse, Macros } from '@/lib/api/member-types'

/** Returns the day object for the given date from diet plan response data. */
export function getDayForDate(data: CurrentDietPlanResponse | undefined, dateStr: string): CurrentDietPlanDay | undefined {
  if (!data?.data) return undefined
  return data.data.days.find(d => d.date === dateStr)
}

/** Sums macros across meals (raw sum; caller rounds for display). */
export function sumMacros(meals: CurrentDietPlanMeal[]): Macros {
  return meals.reduce<Macros>(
    (acc, m) => ({
      calories: acc.calories + m.macros.calories,
      protein: acc.protein + m.macros.protein,
      carbs: acc.carbs + m.macros.carbs,
      fat: acc.fat + m.macros.fat
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
}
