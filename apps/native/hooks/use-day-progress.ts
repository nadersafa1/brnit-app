/**
 * Derives daily progress (consumed vs goals, remaining calories) from
 * a diet plan day and its meals. Used by the home screen for the progress card.
 */

import { useMemo } from 'react'
import type { CurrentDietPlanDay, CurrentDietPlanMeal } from '@/lib/api/member-types'
import { sumMacros } from '@/lib/helpers/diet-plan'
import { roundUpToTenth } from '@/lib/utils/numbers'

export function useDayProgress(day: CurrentDietPlanDay | undefined, meals: CurrentDietPlanMeal[]) {
  return useMemo(() => {
    const consumedMacros = sumMacros(meals.filter(m => m.consumed))
    const caloriesGoal = roundUpToTenth(day?.macros?.calories ?? 0)
    const caloriesConsumed = roundUpToTenth(consumedMacros.calories)
    const remainingCalories = Math.max(0, caloriesGoal - caloriesConsumed)
    const proteinGoal = roundUpToTenth(day?.macros?.protein ?? 0)
    const carbsGoal = roundUpToTenth(day?.macros?.carbs ?? 0)
    const fatGoal = roundUpToTenth(day?.macros?.fat ?? 0)
    const proteinConsumed = roundUpToTenth(consumedMacros.protein)
    const carbsConsumed = roundUpToTenth(consumedMacros.carbs)
    const fatConsumed = roundUpToTenth(consumedMacros.fat)
    const hasPlan = Boolean(day && meals.length > 0)

    return {
      consumedMacros,
      caloriesGoal,
      caloriesConsumed,
      remainingCalories,
      proteinGoal,
      proteinConsumed,
      carbsGoal,
      carbsConsumed,
      fatGoal,
      fatConsumed,
      hasPlan,
    }
  }, [day, meals])
}
