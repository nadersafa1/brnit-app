/**
 * Macro calculation helpers for meal items, meals, and days.
 * Nutrition is stored per 1 unit; quantity is in that unit (grams for 100g, count for piece).
 */

export type Macros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Nutrition per 1 unit (per 100g or per 1 piece depending on food.unit). */
export type NutritionPer100g = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type FoodUnit = '100g' | 'piece'

/** Used when summing or when no nutrition data exists (e.g. missing food item). */
export const ZERO_MACROS: Macros = { calories: 0, protein: 0, carbs: 0, fat: 0 }

/** Round up to the nearest tenth (0.1 step). */
function roundUpToTenth(value: number): number {
  return Math.ceil(value * 10) / 10
}

/**
 * Factor for macro calculation: for 100g, quantity is in grams so factor = quantity/100;
 * for piece, quantity is count so factor = quantity.
 */
export function getMacroFactor(quantity: number, unit: FoodUnit): number {
  return unit === '100g' ? quantity / 100 : quantity
}

/**
 * Equivalent grams for a quantity in the given unit (for alternatives comparison).
 * For 100g, quantity is already grams. For piece, quantity * gramsPerUnit (default 100 if null).
 */
export function toEquivalentGrams(
  quantity: number,
  unit: FoodUnit,
  gramsPerUnit: number | null | undefined
): number {
  if (unit === '100g') return quantity
  const gpu = gramsPerUnit != null && Number.isFinite(Number(gramsPerUnit)) ? Number(gramsPerUnit) : 100
  return quantity * gpu
}

/**
 * Computes macros for a single meal item from quantity (in food's unit), nutrition per 1 unit, and unit.
 * Missing or invalid nutrition values are treated as 0.
 */
export function calculateMacrosForMealItemWithUnit(
  quantity: number,
  nutrition: NutritionPer100g,
  unit: FoodUnit
): Macros {
  const factor = getMacroFactor(quantity, unit)
  return {
    calories: roundUpToTenth(factor * (nutrition.calories ?? 0)),
    protein: roundUpToTenth(factor * (nutrition.protein ?? 0)),
    carbs: roundUpToTenth(factor * (nutrition.carbs ?? 0)),
    fat: roundUpToTenth(factor * (nutrition.fat ?? 0)),
  }
}

/**
 * Computes macros for a single meal item from quantity (grams) and nutrition per 100g.
 * @deprecated Prefer calculateMacrosForMealItemWithUnit when food has a unit.
 */
export function calculateMacrosForMealItem(
  quantityGrams: number,
  nutritionPer100g: NutritionPer100g
): Macros {
  return calculateMacrosForMealItemWithUnit(quantityGrams, nutritionPer100g, '100g')
}

export type MealItemForMacros = {
  quantity: number
  nutrition: NutritionPer100g
  unit: FoodUnit
}

/**
 * Sums macros across multiple meal items (each with quantity, nutrition per 1 unit, and unit).
 */
export function calculateMacrosForMeal(
  items: Array<MealItemForMacros>
): Macros {
  return items.reduce<Macros>(
    (acc, item) => {
      const itemMacros = calculateMacrosForMealItemWithUnit(
        item.quantity,
        item.nutrition,
        item.unit
      )
      return {
        calories: roundUpToTenth(acc.calories + itemMacros.calories),
        protein: roundUpToTenth(acc.protein + itemMacros.protein),
        carbs: roundUpToTenth(acc.carbs + itemMacros.carbs),
        fat: roundUpToTenth(acc.fat + itemMacros.fat),
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
      calories: roundUpToTenth(acc.calories + m.calories),
      protein: roundUpToTenth(acc.protein + m.protein),
      carbs: roundUpToTenth(acc.carbs + m.carbs),
      fat: roundUpToTenth(acc.fat + m.fat),
    }),
    { ...ZERO_MACROS }
  )
}
