/**
 * Pure meal macro math for persisted `meal.total_*` columns and UI summaries.
 * Algorithm: per line, scale stored per-unit macros by quantity and food `unit`, sum raw values,
 * then round each macro once to 2 decimals (matches historical meal summary card behavior).
 */

const MACRO_DECIMAL_PLACES = 2
const MACRO_SCALE = 10 ** MACRO_DECIMAL_PLACES

export type FoodUnitForMealTotals = '100g' | 'piece' | 'liters' | 'cup' | 'tbsp'

export type MealLineForTotals = {
  quantity: number
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: FoodUnitForMealTotals
}

/** Output of {@link computeMealTotalsFromLineItems}; maps 1:1 to `meal` numeric columns. */
export type MealMacroTotals = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export function getMacroFactor(quantity: number, unit: FoodUnitForMealTotals): number {
  return unit === '100g' ? quantity / 100 : quantity
}

export function roundNutritionMacro(value: number): number {
  return Math.round(value * MACRO_SCALE) / MACRO_SCALE
}

/**
 * Same algorithm as the meal detail nutrition summary: scale each line by quantity/unit,
 * sum raw totals, then round each macro once.
 */
export function computeMealTotalsFromLineItems(items: MealLineForTotals[]): MealMacroTotals {
  const rawTotals = items.reduce(
    (acc, mi) => {
      const factor = getMacroFactor(mi.quantity, mi.unit)
      return {
        calories: acc.calories + factor * mi.calories,
        protein: acc.protein + factor * mi.protein,
        carbs: acc.carbs + factor * mi.carbs,
        fat: acc.fat + factor * mi.fat,
      }
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )
  return {
    calories: roundNutritionMacro(rawTotals.calories),
    protein: roundNutritionMacro(rawTotals.protein),
    carbs: roundNutritionMacro(rawTotals.carbs),
    fat: roundNutritionMacro(rawTotals.fat),
  }
}

/**
 * Stringify totals for Drizzle `meal` updates (Postgres `numeric` accepts string literals).
 */
export function mealMacroTotalsToMealColumns(totals: MealMacroTotals) {
  return {
    totalCalories: String(totals.calories),
    totalProtein: String(totals.protein),
    totalCarbs: String(totals.carbs),
    totalFat: String(totals.fat),
  }
}

function toFiniteNumber(v: string | null | undefined): number {
  if (v == null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Map DB join rows (meal_item + food_item numerics as strings) into lines for {@link computeMealTotalsFromLineItems}. */
export function mealTotalsLinesFromDbRows(
  rows: Array<{
    quantity: string
    calories: string | null
    protein: string | null
    carbs: string | null
    fat: string | null
    unit: FoodUnitForMealTotals | null
  }>
): MealLineForTotals[] {
  return rows.map((r) => {
    const unit: FoodUnitForMealTotals = r.unit ?? '100g'
    return {
      quantity: toFiniteNumber(r.quantity),
      calories: toFiniteNumber(r.calories),
      protein: toFiniteNumber(r.protein),
      carbs: toFiniteNumber(r.carbs),
      fat: toFiniteNumber(r.fat),
      unit,
    }
  })
}
