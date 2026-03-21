import { db } from '@burn-app/db'
import { foodItem, foodCategory } from '@burn-app/db/schema'
import { and, eq, ne, isNotNull } from 'drizzle-orm'
import { getAlternativesToleranceConfig } from '@/lib/config/alternatives-tolerance'
import type { FoodUnit } from '@/lib/helpers/macros'

const MAX_PER_PAGE = 20

function toNum(val: string | null | undefined): number {
  if (val === null || val === undefined) return 0
  const n = Number.parseFloat(String(val))
  return Number.isNaN(n) ? 0 : n
}

export interface FoodItemAlternativeItem {
  foodItemId: string
  name: string
  categoryId: string
  categoryName: string
  /** Suggested quantity in this food's unit (e.g. 10 for "10 eggs", 150 for "150g"). */
  suggestedQuantity: number
  unit: FoodUnit
  calories: number
  protein: number
  carbs: number
  fat: number
  deltaCalories: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
  /** @deprecated Use suggestedQuantity + unit for display. */
  suggestedQuantityGrams?: number
}

export type GetAlternativesResult =
  | { ok: true; items: FoodItemAlternativeItem[]; totalItems: number }
  | { ok: false; error: string; code: 'REFERENCE_INVALID' | 'REFERENCE_NOT_FOUND' }

/**
 * Computes reference macros from quantity in the reference food's unit.
 * For 100g: factor = quantity/100. For all other units (piece/liters/cup/tbsp): factor = quantity.
 */
function referenceMacros(
  quantity: number,
  unit: FoodUnit,
  cal: number,
  prot: number,
  carb: number,
  fat: number
): { R_cal: number; R_prot: number; R_carb: number; R_fat: number } {
  const factor = unit === '100g' ? quantity / 100 : quantity
  return {
    R_cal: factor * cal,
    R_prot: factor * prot,
    R_carb: factor * carb,
    R_fat: factor * fat,
  }
}

/**
 * Quantity in the candidate's unit that matches reference calories: factor = R_cal / c_cal;
 * for 100g suggestedQuantity = factor * 100 (grams); for non-100g units suggestedQuantity = factor.
 */
function suggestedQuantityInUnit(
  factor: number,
  candidateUnit: FoodUnit
): number {
  if (candidateUnit === '100g') return Math.round(factor * 1000) / 10
  return Math.round(factor * 10) / 10
}

type ReferenceMacros = { R_cal: number; R_prot: number; R_carb: number; R_fat: number }

type MacroTolerance = {
  protMin: number
  protMax: number
  carbMin: number
  carbMax: number
  fatMin: number
  fatMax: number
}

function buildMacroTolerance(reference: ReferenceMacros) {
  const tol = getAlternativesToleranceConfig()
  return {
    protMin: reference.R_prot * (1 - tol.proteinPct / 100),
    protMax: reference.R_prot * (1 + tol.proteinPct / 100),
    carbMin: reference.R_carb * (1 - tol.carbsPct / 100),
    carbMax: reference.R_carb * (1 + tol.carbsPct / 100),
    fatMin: reference.R_fat * (1 - tol.fatPct / 100),
    fatMax: reference.R_fat * (1 + tol.fatPct / 100),
  } satisfies MacroTolerance
}

function matchesTolerance(
  protein: number,
  carbs: number,
  fat: number,
  tolerance: MacroTolerance
): boolean {
  if (protein < tolerance.protMin || protein > tolerance.protMax) return false
  if (carbs < tolerance.carbMin || carbs > tolerance.carbMax) return false
  if (fat < tolerance.fatMin || fat > tolerance.fatMax) return false
  return true
}

function toSuggestedQuantityGrams(
  unit: FoodUnit,
  suggestedQuantity: number,
  gramsPerUnit: number | null
): number | undefined {
  if (unit === '100g') return suggestedQuantity
  if (gramsPerUnit == null) return undefined
  return suggestedQuantity * gramsPerUnit
}

export async function getFoodItemAlternatives(
  foodItemId: string,
  quantity: number,
  page: number,
  perPage: number
): Promise<GetAlternativesResult> {
  const limit = Math.min(Math.max(1, perPage), MAX_PER_PAGE)
  const offset = Math.max(0, (page - 1) * limit)

  const [refRow] = await db
    .select({
      id: foodItem.id,
      name: foodItem.name,
      categoryId: foodItem.categoryId,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      unit: foodItem.unit,
      gramsPerUnit: foodItem.gramsPerUnit,
    })
    .from(foodItem)
    .where(eq(foodItem.id, foodItemId))
    .limit(1)

  if (!refRow) {
    return { ok: false, error: 'Food item not found', code: 'REFERENCE_NOT_FOUND' }
  }

  const cal = toNum(refRow.calories)
  const prot = toNum(refRow.protein)
  const carb = toNum(refRow.carbs)
  const fat = toNum(refRow.fat)
  const refUnit = (refRow.unit ?? '100g') as FoodUnit

  if (
    refRow.calories === null ||
    refRow.protein === null ||
    refRow.carbs === null ||
    refRow.fat === null ||
    refRow.categoryId === null
  ) {
    return {
      ok: false,
      error: 'Reference food item has missing macros or category',
      code: 'REFERENCE_INVALID',
    }
  }

  const reference = referenceMacros(
    quantity,
    refUnit,
    cal,
    prot,
    carb,
    fat
  )
  const tolerance = buildMacroTolerance(reference)

  const candidates = await db
    .select({
      id: foodItem.id,
      name: foodItem.name,
      categoryId: foodItem.categoryId,
      categoryName: foodCategory.name,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      unit: foodItem.unit,
      gramsPerUnit: foodItem.gramsPerUnit,
    })
    .from(foodItem)
    .innerJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(
      and(
        eq(foodItem.categoryId, refRow.categoryId),
        ne(foodItem.id, foodItemId),
        isNotNull(foodItem.calories),
        isNotNull(foodItem.protein),
        isNotNull(foodItem.carbs),
        isNotNull(foodItem.fat)
      )
    )

  const results: FoodItemAlternativeItem[] = []

  for (const row of candidates) {
    const c_cal = toNum(row.calories)
    const c_prot = toNum(row.protein)
    const c_carb = toNum(row.carbs)
    const c_fat = toNum(row.fat)
    const candidateUnit = (row.unit ?? '100g') as FoodUnit
    const gramsPerUnit = row.gramsPerUnit == null ? null : Number(row.gramsPerUnit)

    if (c_cal <= 0) continue

    const factor = reference.R_cal / c_cal
    const C_prot = factor * c_prot
    const C_carb = factor * c_carb
    const C_fat = factor * c_fat

    if (!matchesTolerance(C_prot, C_carb, C_fat, tolerance)) continue

    const suggestedQ = suggestedQuantityInUnit(factor, candidateUnit)
    const totalCal = factor * c_cal
    const totalProt = C_prot
    const totalCarb = C_carb
    const totalFat = C_fat

    const suggestedQuantityGrams = toSuggestedQuantityGrams(candidateUnit, suggestedQ, gramsPerUnit)

    results.push({
      foodItemId: row.id,
      name: row.name,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      suggestedQuantity: suggestedQ,
      unit: candidateUnit,
      calories: Math.round(totalCal * 10) / 10,
      protein: Math.round(totalProt * 10) / 10,
      carbs: Math.round(totalCarb * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      deltaCalories: Math.round((totalCal - reference.R_cal) * 10) / 10,
      deltaProtein: Math.round((totalProt - reference.R_prot) * 10) / 10,
      deltaCarbs: Math.round((totalCarb - reference.R_carb) * 10) / 10,
      deltaFat: Math.round((totalFat - reference.R_fat) * 10) / 10,
      ...(suggestedQuantityGrams !== undefined && { suggestedQuantityGrams }),
    })
  }

  results.sort((a, b) => Math.abs(a.calories - reference.R_cal) - Math.abs(b.calories - reference.R_cal))

  const totalItems = results.length
  const items = results.slice(offset, offset + limit)

  return {
    ok: true,
    items,
    totalItems,
  }
}
