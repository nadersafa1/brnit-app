import type { FoodUnit } from '@/types/api/food.schemas'

/** Short label for admin tables and detail (liters → L). */
export function formatFoodUnitLabel(unit: FoodUnit | null | undefined): string {
  if (unit == null) return '–'
  if (unit === 'liters') return 'L'
  return unit
}

/** Placeholder for grams-per-unit field by unit. */
export function gramsPerUnitPlaceholder(unit: FoodUnit): string {
  switch (unit) {
    case 'liters':
      return 'e.g. 1030 for milk density'
    case 'cup':
      return 'e.g. 240 for US cup'
    case 'tbsp':
      return 'e.g. 15 for 1 tbsp'
    case 'piece':
      return 'e.g. 50 for one egg'
    default:
      return 'e.g. 50'
  }
}

/** Number input step for meal quantity by food unit. */
export function mealQuantityStep(unit: FoodUnit): number {
  if (unit === 'liters') return 0.1
  if (unit === 'cup' || unit === 'tbsp') return 0.25
  return 1
}

/** Placeholder for meal / add-food quantity inputs. */
export function mealQuantityPlaceholder(unit: FoodUnit | undefined): string {
  if (unit == null) return 'e.g. 100'
  switch (unit) {
    case 'piece':
      return 'e.g. 2'
    case 'liters':
      return 'e.g. 0.5'
    case 'cup':
    case 'tbsp':
      return 'e.g. 1'
    default:
      return 'e.g. 100'
  }
}
