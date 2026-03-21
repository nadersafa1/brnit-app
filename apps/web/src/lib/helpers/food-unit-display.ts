/**
 * Admin meal quantity UX and display helpers: HTML step/min, snapping (aligned with
 * alternatives API), labels and formatted strings. Single source of truth for unit steps;
 * native mirrors in `apps/native/lib/utils/food-quantity-step.ts`.
 */
import type { FoodUnit } from '@/types/api/food.schemas'

// --- Food item admin (grams-per-unit field) ---

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

// --- Meal quantity inputs (step / min / snap — shared with alternatives rounding) ---

/**
 * Quantity step per food unit (meal items, alternatives inputs).
 * piece=1, cup/tbsp/liters=0.5, 100g=50g increments.
 */
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

/** Smallest valid positive quantity for HTML `min` (aligned with step). */
export function mealQuantityMin(unit: FoodUnit): number {
  return mealQuantityStep(unit)
}

/**
 * Snap a raw quantity to the nearest allowed step for the unit (for display/API alignment).
 * Result is at least `mealQuantityMin(unit)` so alternatives never suggest zero invalid amounts.
 */
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

// --- Meal UI copy (placeholders, suffixes, read-only quantity text) ---

/** Placeholder for meal / add-food quantity inputs. */
export function mealQuantityPlaceholder(unit: FoodUnit | undefined): string {
  if (unit == null) return 'e.g. 100'
  switch (unit) {
    case '100g':
      return 'e.g. 150'
    case 'piece':
      return 'e.g. 2'
    case 'liters':
      return 'e.g. 1'
    case 'cup':
    case 'tbsp':
      return 'e.g. 1'
  }
}

/** Label suffix used by quantity inputs in meal editing UIs. */
export function mealQuantitySuffix(unit: FoodUnit | undefined): string {
  if (unit == null) return ''
  switch (unit) {
    case '100g':
      return ' (g)'
    case 'piece':
      return ' (pieces)'
    case 'liters':
      return ' (L)'
    case 'cup':
      return ' (cups)'
    case 'tbsp':
      return ' (tbsp)'
  }
}

function compactQuantity(quantity: number): string {
  return Number.isInteger(quantity) || quantity % 1 === 0
    ? String(quantity)
    : (Math.round(quantity * 1000) / 1000).toString()
}

/** Readable quantity text in meal tables (e.g. 2 pcs, 0.5L, 1 cup, 150 g). */
export function formatMealQuantityWithUnit(quantity: number, unit: FoodUnit): string {
  switch (unit) {
    case '100g':
      return `${compactQuantity(quantity)} g`
    case 'piece':
      return `${quantity} pcs`
    case 'liters':
      return `${compactQuantity(quantity)}L`
    case 'cup': {
      const q = compactQuantity(quantity)
      return `${q} cup${quantity === 1 ? '' : 's'}`
    }
    case 'tbsp':
      return `${compactQuantity(quantity)} tbsp`
  }
}
