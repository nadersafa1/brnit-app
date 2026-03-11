import { db } from '@burn-app/db'
import { foodItem, foodCategory } from '@burn-app/db/schema'
import { and, eq, ne, isNotNull } from 'drizzle-orm'
import { getAlternativesToleranceConfig } from '@/lib/config/alternatives-tolerance'

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
  suggestedQuantityGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  deltaCalories: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
}

export type GetAlternativesResult =
  | { ok: true; items: FoodItemAlternativeItem[]; totalItems: number }
  | { ok: false; error: string; code: 'REFERENCE_INVALID' | 'REFERENCE_NOT_FOUND' }

export async function getFoodItemAlternatives(
  foodItemId: string,
  quantityGrams: number,
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

  const R_cal = (cal * quantityGrams) / 100
  const R_prot = (prot * quantityGrams) / 100
  const R_carb = (carb * quantityGrams) / 100
  const R_fat = (fat * quantityGrams) / 100

  const tol = getAlternativesToleranceConfig()
  const protMin = R_prot * (1 - tol.proteinPct / 100)
  const protMax = R_prot * (1 + tol.proteinPct / 100)
  const carbMin = R_carb * (1 - tol.carbsPct / 100)
  const carbMax = R_carb * (1 + tol.carbsPct / 100)
  const fatMin = R_fat * (1 - tol.fatPct / 100)
  const fatMax = R_fat * (1 + tol.fatPct / 100)

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

    if (c_cal <= 0) continue

    const Q = (R_cal * 100) / c_cal
    const C_prot = (c_prot * Q) / 100
    const C_carb = (c_carb * Q) / 100
    const C_fat = (c_fat * Q) / 100

    if (C_prot < protMin || C_prot > protMax) continue
    if (C_carb < carbMin || C_carb > carbMax) continue
    if (C_fat < fatMin || C_fat > fatMax) continue

    const totalCal = (c_cal * Q) / 100
    const totalProt = C_prot
    const totalCarb = C_carb
    const totalFat = C_fat

    results.push({
      foodItemId: row.id,
      name: row.name,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      suggestedQuantityGrams: Math.round(Q * 10) / 10,
      calories: Math.round(totalCal * 10) / 10,
      protein: Math.round(totalProt * 10) / 10,
      carbs: Math.round(totalCarb * 10) / 10,
      fat: Math.round(totalFat * 10) / 10,
      deltaCalories: Math.round((totalCal - R_cal) * 10) / 10,
      deltaProtein: Math.round((totalProt - R_prot) * 10) / 10,
      deltaCarbs: Math.round((totalCarb - R_carb) * 10) / 10,
      deltaFat: Math.round((totalFat - R_fat) * 10) / 10,
    })
  }

  results.sort((a, b) => Math.abs(a.calories - R_cal) - Math.abs(b.calories - R_cal))

  const totalItems = results.length
  const items = results.slice(offset, offset + limit)

  return {
    ok: true,
    items,
    totalItems,
  }
}
