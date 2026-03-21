import { db } from '@burn-app/db'
import { dietPlan, dietPlanAssignment, dietPlanMealConsumption, foodItem, member } from '@burn-app/db/schema'
import { and, asc, eq, inArray, or, SQL } from 'drizzle-orm'
import {
  calculateMacrosForDay,
  calculateMacrosForMealItemWithUnit,
  type NutritionPer100g,
  type FoodUnit,
} from '@/lib/helpers/macros'
import { getDietPlanById } from '@/lib/services/diet-plans'
import {
  getOverridesByAssignmentId,
  resolveOverridesForDate,
  type OverrideRow,
} from '@/lib/services/diet-plan-meal-item-override'
import {
  getMealTimeOverridesByAssignmentId,
  resolveMealTimeOverridesForDate,
  type MealTimeOverrideRow,
} from '@/lib/services/diet-plan-meal-time-override'
import type {
  CurrentDietPlanDay,
  CurrentDietPlanMeal,
  CurrentDietPlanQuery,
  CurrentDietPlanMealItem,
} from '@/types/api/current-diet-plan.schemas'

/**
 * Current diet plan service: returns the active assignment and daily meal structure
 * (with overrides and consumptions) plus computed macros per item/meal/day.
 * Read-only; no transactions. Failures propagate to the route handler.
 */

// --- Date helpers (UTC, YYYY-MM-DD) ---

function toDateStringUTC(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysUTC(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toDateStringUTC(d)
}

function diffDaysInclusiveUTC(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00.000Z`)
  const toDate = new Date(`${to}T00:00:00.000Z`)
  const diffMs = toDate.getTime() - fromDate.getTime()
  return diffMs / (1000 * 60 * 60 * 24) + 1
}

function getTodayUTC(): string {
  return toDateStringUTC(new Date())
}

// --- Response types ---

type CurrentDietPlanAssignment = {
  id: string
  dietPlanId: string
  startDate: string
  endDate: string
  planName: string
}

export type CurrentDietPlanResult =
  | { data: null }
  | {
      data: {
        assignment: CurrentDietPlanAssignment
        plan: {
          id: string
          name: string
          description: string | null
        }
        days: CurrentDietPlanDay[]
      }
    }

/**
 * Returns member IDs linked to the given user (for assignment visibility).
 */
async function getUserMemberIds(userId: string): Promise<string[]> {
  const rows = await db.select({ id: member.id }).from(member).where(eq(member.userId, userId))
  return rows.map(m => m.id)
}

/**
 * Collects all unique food item IDs referenced by plan meal items and overrides.
 * Used to batch-fetch nutrition so we can compute macros without N+1 queries.
 */
function collectFoodItemIds(
  dietPlanMeals: Array<{ mealItems?: Array<{ foodItemId: string }> }>,
  overrideRows: OverrideRow[]
): Set<string> {
  const ids = new Set<string>()
  for (const pm of dietPlanMeals) {
    for (const item of pm.mealItems ?? []) {
      ids.add(item.foodItemId)
    }
  }
  for (const row of overrideRows) {
    ids.add(row.foodItemId)
  }
  return ids
}

export type FoodDetails = {
  nutrition: NutritionPer100g
  unit: FoodUnit
  gramsPerUnit: number | null
}

/**
 * Fetches nutrition (per 1 unit), unit, and gramsPerUnit for the given food item IDs.
 * Null/undefined DB values are coerced to 0 so macro math never produces NaN.
 * Missing IDs are absent from the map; callers use ZERO_NUTRITION and default unit '100g'.
 */
async function getFoodDetailsForIds(foodItemIds: Set<string>): Promise<Map<string, FoodDetails>> {
  const map = new Map<string, FoodDetails>()
  if (foodItemIds.size === 0) return map

  const toNum = (v: string | null | undefined): number => (v != null && Number.isFinite(Number(v)) ? Number(v) : 0)

  const rows = await db
    .select({
      id: foodItem.id,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      unit: foodItem.unit,
      gramsPerUnit: foodItem.gramsPerUnit,
    })
    .from(foodItem)
    .where(inArray(foodItem.id, [...foodItemIds]))

  for (const row of rows) {
    const unit = (row.unit ?? '100g') as FoodUnit
    map.set(row.id, {
      nutrition: {
        calories: toNum(row.calories),
        protein: toNum(row.protein),
        carbs: toNum(row.carbs),
        fat: toNum(row.fat),
      },
      unit,
      gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
    })
  }
  return map
}

const DEFAULT_FOOD_DETAILS: FoodDetails = {
  nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
  unit: '100g',
  gramsPerUnit: null,
}

/**
 * Builds the days array: for each date, resolves overrides and consumptions,
 * attaches per-item and per-meal macros from the food details map, and per-day macros.
 * Pure/synchronous; all data is already loaded.
 */
function buildCurrentDietPlanDays(
  allDates: string[],
  assignment: { startDate: string },
  dietPlanMeals: Array<{
    id: string
    mealId: string
    mealName: string
    dayNumber: number
    mealType: string
    mealOrder: number
    scheduledTime: string | null
    mealItems: Array<{ mealItemId: string; foodItemId: string; foodName: string; quantity: number }>
  }>,
  overrideRows: OverrideRow[],
  mealTimeOverrideRows: MealTimeOverrideRow[],
  consumptionMap: Map<string, { consumedAt: string }>,
  foodDetailsMap: Map<string, FoodDetails>
): CurrentDietPlanDay[] {
  return allDates.map(date => {
    const planDay = diffDaysInclusiveUTC(assignment.startDate, date)
    const resolvedOverrides = resolveOverridesForDate(overrideRows, date)
    const overrideMapForDay = new Map<string, { foodItemId: string; foodName: string; quantity: number }>()
    for (const [, row] of resolvedOverrides) {
      overrideMapForDay.set(`${row.dietPlanMealId}:${row.mealItemId}`, {
        foodItemId: row.foodItemId,
        foodName: row.foodName,
        quantity: Number(row.quantity),
      })
    }
    const resolvedMealTimes = resolveMealTimeOverridesForDate(mealTimeOverrideRows, date)
    const mealsForDay = dietPlanMeals
      .filter(pm => pm.dayNumber === 0 || pm.dayNumber === planDay)
      .sort((a, b) => {
        const byMealOrder = a.mealOrder - b.mealOrder
        if (byMealOrder !== 0) return byMealOrder
        const byMealType = a.mealType.localeCompare(b.mealType)
        if (byMealType !== 0) return byMealType
        return a.id.localeCompare(b.id)
      })
      .map<CurrentDietPlanMeal>(pm => {
        const key = `${pm.id}:${date}`
        const consumption = consumptionMap.get(key)
        const mealItems: CurrentDietPlanMealItem[] = (pm.mealItems ?? []).map(item => {
          const override = overrideMapForDay.get(`${pm.id}:${item.mealItemId}`)
          const foodItemId = override?.foodItemId ?? item.foodItemId
          const quantity = override?.quantity ?? item.quantity
          const details = foodDetailsMap.get(foodItemId) ?? DEFAULT_FOOD_DETAILS
          const macros = calculateMacrosForMealItemWithUnit(quantity, details.nutrition, details.unit)
          if (override) {
            const overrideDetails = foodDetailsMap.get(override.foodItemId) ?? DEFAULT_FOOD_DETAILS
            const originalDetails = foodDetailsMap.get(item.foodItemId) ?? DEFAULT_FOOD_DETAILS
            return {
              mealItemId: item.mealItemId,
              foodItemId: override.foodItemId,
              foodName: override.foodName,
              quantity: override.quantity,
              unit: overrideDetails.unit,
              gramsPerUnit: overrideDetails.gramsPerUnit,
              isOverridden: true,
              originalFoodItemId: item.foodItemId,
              originalFoodName: item.foodName,
              originalQuantity: item.quantity,
              originalUnit: originalDetails.unit,
              macros,
            }
          }
          return {
            mealItemId: item.mealItemId,
            foodItemId: item.foodItemId,
            foodName: item.foodName,
            quantity: item.quantity,
            unit: details.unit,
            gramsPerUnit: details.gramsPerUnit,
            isOverridden: false,
            macros,
          }
        })
        const mealMacros = calculateMacrosForDay(mealItems.map(i => i.macros))
        return {
          dietPlanMealId: pm.id,
          mealId: pm.mealId,
          mealName: pm.mealName,
          mealType: pm.mealType,
          mealOrder: pm.mealOrder,
          scheduledTime: resolvedMealTimes.get(pm.id) ?? pm.scheduledTime ?? undefined,
          mealItems,
          consumed: !!consumption,
          consumedAt: consumption?.consumedAt,
          macros: mealMacros,
        }
      })
    const dayMacros = calculateMacrosForDay(mealsForDay.map(m => m.macros))
    return { date, meals: mealsForDay, macros: dayMacros }
  })
}

export async function getCurrentDietPlanForUser(
  userId: string,
  query: CurrentDietPlanQuery
): Promise<CurrentDietPlanResult> {
  const today = getTodayUTC()
  const from = query.from ?? today
  const to = query.to ?? addDaysUTC(from, 6)

  // Resolve which assignment(s) the user can see (direct or via member).
  const memberIds = await getUserMemberIds(userId)
  const assigneeConditions: SQL<unknown>[] = [eq(dietPlanAssignment.userId, userId)]
  if (memberIds.length > 0) {
    assigneeConditions.push(inArray(dietPlanAssignment.memberId, memberIds))
  }

  const rows = await db
    .select({
      id: dietPlanAssignment.id,
      dietPlanId: dietPlanAssignment.dietPlanId,
      startDate: dietPlanAssignment.startDate,
      endDate: dietPlanAssignment.endDate,
      planName: dietPlan.name,
    })
    .from(dietPlanAssignment)
    .innerJoin(dietPlan, eq(dietPlanAssignment.dietPlanId, dietPlan.id))
    .where(and(or(...assigneeConditions)))
    .orderBy(asc(dietPlanAssignment.startDate))

  if (rows.length === 0) {
    return { data: null }
  }

  // Use the assignment that covers the range start (from), or fallback to first.
  const containing = rows.filter(r => r.startDate <= from && r.endDate >= from)
  const assignment = (containing.length > 0 ? containing : rows)[0]

  // Fetch plan and overrides in parallel; neither depends on the other.
  const [planFull, overrideRows, mealTimeOverrideRows] = await Promise.all([
    getDietPlanById(assignment.dietPlanId),
    getOverridesByAssignmentId(assignment.id),
    getMealTimeOverridesByAssignmentId(assignment.id),
  ])

  if (!planFull) {
    return { data: null }
  }

  const plan = {
    id: planFull.id,
    name: planFull.name,
    description: planFull.description,
  }

  const dietPlanMeals = planFull.dietPlanMeals ?? []

  // Build the list of dates in range that fall within the assignment window.
  const allDates: string[] = []
  let cursor = from
  while (cursor <= to) {
    if (cursor >= assignment.startDate && cursor <= assignment.endDate) {
      allDates.push(cursor)
    }
    cursor = addDaysUTC(cursor, 1)
  }

  if (allDates.length === 0) {
    return { data: null }
  }

  // Fetch consumptions and food details (nutrition + unit) in parallel.
  const foodItemIds = collectFoodItemIds(dietPlanMeals, overrideRows)
  const [consumptionRows, foodDetailsMap] = await Promise.all([
    db
      .select({
        dietPlanMealId: dietPlanMealConsumption.dietPlanMealId,
        consumedDate: dietPlanMealConsumption.consumedDate,
        consumedAt: dietPlanMealConsumption.consumedAt,
      })
      .from(dietPlanMealConsumption)
      .where(
        and(
          eq(dietPlanMealConsumption.dietPlanAssignmentId, assignment.id),
          inArray(dietPlanMealConsumption.consumedDate, allDates)
        )
      ),
    getFoodDetailsForIds(foodItemIds),
  ])

  const consumptionMap = new Map<string, { consumedAt: string }>()
  for (const row of consumptionRows) {
    const key = `${row.dietPlanMealId}:${row.consumedDate}`
    consumptionMap.set(key, { consumedAt: row.consumedAt.toISOString() })
  }

  const days = buildCurrentDietPlanDays(
    allDates,
    assignment,
    dietPlanMeals,
    overrideRows,
    mealTimeOverrideRows,
    consumptionMap,
    foodDetailsMap
  )

  return {
    data: {
      assignment: {
        id: assignment.id,
        dietPlanId: assignment.dietPlanId,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
        planName: assignment.planName,
      },
      plan,
      days,
    },
  }
}
