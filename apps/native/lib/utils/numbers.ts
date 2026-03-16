/**
 * Rounds up to the nearest tenth (0.1 step).
 * Use for macro display so values are never under-reported.
 */
export function roundUpToTenth(value: number): number {
  return Math.ceil(value * 10) / 10
}

/**
 * Formats a calorie value for display: whole number or one decimal.
 * Use for consistent "X" or "X.1" display across meal cards and items.
 */
export function formatCalorieDisplay(value: number): string {
  return value % 1 === 0 ? String(value) : value.toFixed(1)
}

export type FoodUnit = '100g' | 'piece'

/**
 * Formats quantity with unit for display (e.g. "150g", "2 pieces").
 */
export function formatQuantityWithUnit(quantity: number, unit: FoodUnit): string {
  if (unit === '100g') return `${quantity}g`
  const q = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1)
  return `${q} piece${quantity === 1 ? '' : 's'}`
}
