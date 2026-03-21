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

/** Label suffix used by quantity inputs in meal editing UIs. */
export function mealQuantitySuffix(unit: FoodUnit | undefined): string {
  if (unit == null) return ''
  switch (unit) {
    case 'piece':
      return ' (pieces)'
    case 'liters':
      return ' (L)'
    case 'cup':
      return ' (cups)'
    case 'tbsp':
      return ' (tbsp)'
    default:
      return ' (g)'
  }
}

function compactQuantity(quantity: number): string {
  return Number.isInteger(quantity) || quantity % 1 === 0
    ? String(quantity)
    : (Math.round(quantity * 1000) / 1000).toString()
}

/** Readable quantity text in meal tables (e.g. 2 pcs, 0.5L, 1 cup). */
export function formatMealQuantityWithUnit(quantity: number, unit: FoodUnit): string {
  if (unit === 'piece') return `${quantity} pcs`
  if (unit === 'liters') return `${compactQuantity(quantity)}L`
  if (unit === 'cup') {
    const q = compactQuantity(quantity)
    return `${q} cup${quantity === 1 ? '' : 's'}`
  }
  if (unit === 'tbsp') return `${compactQuantity(quantity)} tbsp`
  return `${quantity} g`
}
