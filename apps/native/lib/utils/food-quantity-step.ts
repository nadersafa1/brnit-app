/**
 * Meal/alternatives quantity steps — keep in sync with web
 * `apps/web/src/lib/helpers/food-unit-display.ts`.
 */
import type { FoodUnit } from '@/lib/utils/numbers'

export function mealQuantityStep(unit: FoodUnit): number {
  switch (unit) {
    case '100g':
      return 50
    case 'piece':
      return 1
    case 'liters':
      return 0.5
    case 'cup':
    case 'tbsp':
      return 0.5
  }
}

export function mealQuantityMin(unit: FoodUnit): number {
  return mealQuantityStep(unit)
}

function decimalPlacesForStep(step: number): number {
  if (step % 1 === 0) return 0
  return String(step).split('.')[1]?.length ?? 1
}

export function snapMealQuantityToStep(quantity: number, unit: FoodUnit): number {
  const step = mealQuantityStep(unit)
  const min = mealQuantityMin(unit)
  if (step <= 0 || !Number.isFinite(quantity)) return Math.max(quantity, min)
  const snapped = Math.round(quantity / step) * step
  const decimals = decimalPlacesForStep(step)
  const rounded = Math.round(snapped * 10 ** decimals) / 10 ** decimals
  return Math.max(min, rounded)
}
