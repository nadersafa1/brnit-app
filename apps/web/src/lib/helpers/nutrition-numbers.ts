/** Precision for stored and API nutrition macro fields (calories, protein, carbs, fat). */
const MACRO_DECIMAL_PLACES = 2
const MACRO_SCALE = 10 ** MACRO_DECIMAL_PLACES

type NumericInput = string | number | null | undefined

function parseFiniteNumber(value: NumericInput): number | null {
  if (value == null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/**
 * Rounds a finite number to two decimal places for nutrition macros.
 * Use for JSON responses and display totals so Postgres `numeric` and float math stay readable.
 */
export function roundNutritionMacro(value: number): number {
  return Math.round(value * MACRO_SCALE) / MACRO_SCALE
}

/** Optional nullable macro column from DB (string | number from Drizzle `numeric`). */
export function roundNutritionMacroNullable(
  value: NumericInput
): number | null {
  const n = parseFiniteNumber(value)
  if (n == null) return null
  return roundNutritionMacro(n)
}

/** Required macro (e.g. calories); missing/invalid treated as 0. */
export function roundNutritionMacroRequired(
  value: NumericInput
): number {
  const n = parseFiniteNumber(value)
  if (n == null) return 0
  return roundNutritionMacro(n)
}
