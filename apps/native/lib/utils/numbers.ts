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

export type FoodUnit = '100g' | 'piece' | 'liters' | 'cup' | 'tbsp'

/**
 * Formats quantity with unit for display (e.g. "150g", "2 pieces", "0.5L", "1 cup").
 */
export function formatQuantityWithUnit(quantity: number, unit: FoodUnit): string {
  if (unit === '100g') {
    const q =
      quantity % 1 === 0 ? String(quantity) : (Math.round(quantity * 10) / 10).toString()
    return `${q}g`
  }
  if (unit === 'liters') {
    const q = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1)
    return `${q}L`
  }
  if (unit === 'cup') {
    const q = quantity % 1 === 0 ? String(quantity) : (Math.round(quantity * 1000) / 1000).toString()
    return `${q} cup${quantity === 1 ? '' : 's'}`
  }
  if (unit === 'tbsp') {
    const q = quantity % 1 === 0 ? String(quantity) : (Math.round(quantity * 1000) / 1000).toString()
    return `${q} tbsp`
  }
  const q = quantity % 1 === 0 ? String(quantity) : quantity.toFixed(1)
  return `${q} piece${quantity === 1 ? '' : 's'}`
}
