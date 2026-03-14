/**
 * Macro calculation helpers for meal items, meals, and days.
 * All calculations assume food nutrition is stored per 100g and quantity is in grams.
 */

export type Macros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type NutritionPer100g = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Used when summing or when no nutrition data exists (e.g. missing food item). */
export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }

const ROUND_PRECISION = 1

function round(value: number): number {
  return Math.round(value * 10 ** ROUND_PRECISION) / 10 ** ROUND_PRECISION
}

/**
 * Computes macros for a single meal item from quantity (grams) and nutrition per 100g.
 * Missing or invalid nutrition values are treated as 0.
 */
export function calculateMacrosForMealItem(
  quantityGrams: number,
  nutritionPer100g: NutritionPer100g
): Macros {
  const factor = quantityGrams / 100
  return {
    calories: round(factor * (nutritionPer100g.calories ?? 0)),
    protein: round(factor * (nutritionPer100g.protein ?? 0)),
    carbs: round(factor * (nutritionPer100g.carbs ?? 0)),
    fat: round(factor * (nutritionPer100g.fat ?? 0)),
  }
}

/**
 * Sums macros across multiple meal items (each with quantity and nutrition per 100g).
 * Use when you have raw item data but not pre-computed item macros.
 */
export function calculateMacrosForMeal(
  items: Array<{ quantity: number; nutritionPer100g: NutritionPer100g }>
): Macros {
  return items.reduce<Macros>(
    (acc, item) => {
      const itemMacros = calculateMacrosForMealItem(item.quantity, item.nutritionPer100g)
      return {
        calories: round(acc.calories + itemMacros.calories),
        protein: round(acc.protein + itemMacros.protein),
        carbs: round(acc.carbs + itemMacros.carbs),
        fat: round(acc.fat + itemMacros.fat),
      }
    },
    { ...ZERO_MACROS }
  )
}

/**
 * Sums macros across meals (e.g. for a single day).
 * Accepts pre-computed Macros per meal; no nutrition lookup.
 */
export function calculateMacrosForDay(meals: Macros[]): Macros {
  return meals.reduce<Macros>(
    (acc, m) => ({
      calories: round(acc.calories + m.calories),
      protein: round(acc.protein + m.protein),
      carbs: round(acc.carbs + m.carbs),
      fat: round(acc.fat + m.fat),
    }),
    { ...ZERO_MACROS }
  )
}
