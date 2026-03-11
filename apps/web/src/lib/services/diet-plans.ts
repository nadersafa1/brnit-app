import { db } from '@burn-app/db'
import { dietPlan, dietPlanMeal, meal, mealItem, foodItem } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq, and, inArray } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import type { DietPlansQuery, CreateDietPlan, UpdateDietPlan } from '@/types/api/diet-plan.schemas'

export async function listDietPlans(query: DietPlansQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    conditions.push(ilike(dietPlan.name, `%${q}%`))
  }
  const where = combineConditions(conditions)

  const sortFieldMap = {
    name: dietPlan.name,
    createdAt: dietPlan.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? dietPlan.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, items] = await Promise.all([
    db.select({ count: count() }).from(dietPlan).where(where),
    db
      .select({
        id: dietPlan.id,
        name: dietPlan.name,
        description: dietPlan.description,
        createdAt: dietPlan.createdAt,
        updatedAt: dietPlan.updatedAt,
        slotCount: count(dietPlanMeal.id),
      })
      .from(dietPlan)
      .leftJoin(dietPlanMeal, eq(dietPlan.id, dietPlanMeal.dietPlanId))
      .where(where)
      .groupBy(dietPlan.id, dietPlan.name, dietPlan.description, dietPlan.createdAt, dietPlan.updatedAt)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  return {
    items: items.map(({ slotCount, ...rest }) => ({
      ...rest,
      slotCount: Number(slotCount) ?? 0,
    })),
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function createDietPlan(data: CreateDietPlan) {
  const { name, description, dietPlanMeals } = data

  const [newPlan] = await db.insert(dietPlan).values({ name, description }).returning()

  if (!newPlan) return null

  if (dietPlanMeals.length > 0) {
    await db.insert(dietPlanMeal).values(
      dietPlanMeals.map((item) => ({
        dietPlanId: newPlan.id,
        mealId: item.mealId,
        dayNumber: item.dayNumber,
        mealType: item.mealType,
        mealOrder: item.mealOrder ?? 1,
      }))
    )
  }

  return newPlan
}

export async function getDietPlanById(id: string) {
  const [plan] = await db
    .select({
      id: dietPlan.id,
      name: dietPlan.name,
      description: dietPlan.description,
      createdAt: dietPlan.createdAt,
      updatedAt: dietPlan.updatedAt,
    })
    .from(dietPlan)
    .where(eq(dietPlan.id, id))
    .limit(1)

  if (!plan) return null

  const planMeals = await db
    .select({
      id: dietPlanMeal.id,
      mealId: dietPlanMeal.mealId,
      mealName: meal.name,
      dayNumber: dietPlanMeal.dayNumber,
      mealType: dietPlanMeal.mealType,
      mealOrder: dietPlanMeal.mealOrder,
    })
    .from(dietPlanMeal)
    .innerJoin(meal, eq(dietPlanMeal.mealId, meal.id))
    .where(eq(dietPlanMeal.dietPlanId, id))
    .orderBy(
      asc(dietPlanMeal.dayNumber),
      asc(dietPlanMeal.mealType),
      asc(dietPlanMeal.mealOrder)
    )

  const mealIds = [...new Set(planMeals.map((pm) => pm.mealId))]
  type MealItemRow = {
    mealItemId: string
    foodItemId: string
    foodName: string
    quantity: number
  }
  const mealItemsByMealId = new Map<string, MealItemRow[]>()

  if (mealIds.length > 0) {
    const items = await db
      .select({
        mealId: mealItem.mealId,
        mealItemId: mealItem.id,
        foodItemId: mealItem.foodItemId,
        foodName: foodItem.name,
        quantity: mealItem.quantity,
      })
      .from(mealItem)
      .innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
      .where(inArray(mealItem.mealId, mealIds))

    for (const row of items) {
      const list = mealItemsByMealId.get(row.mealId) ?? []
      list.push({
        mealItemId: row.mealItemId,
        foodItemId: row.foodItemId,
        foodName: row.foodName,
        quantity: Number(row.quantity),
      })
      mealItemsByMealId.set(row.mealId, list)
    }
  }

  return {
    ...plan,
    dietPlanMeals: planMeals.map((pm) => ({
      id: pm.id,
      mealId: pm.mealId,
      mealName: pm.mealName,
      dayNumber: pm.dayNumber,
      mealType: pm.mealType,
      mealOrder: pm.mealOrder,
      mealItems: mealItemsByMealId.get(pm.mealId) ?? [],
    })),
  }
}

export type DietPlanSlot = {
  dayNumber: number
  mealType: string
  mealOrder: number
  alternatives: Array<{ id: string; mealId: string; mealName: string }>
}

export async function getDietPlanSlotsForMember(id: string) {
  const full = await getDietPlanById(id)
  if (!full) return null

  const { dietPlanMeals, ...plan } = full
  const slotsMap = new Map<string, DietPlanSlot>()
  for (const pm of dietPlanMeals) {
    const key = `${pm.dayNumber}-${pm.mealType}-${pm.mealOrder}`
    const existing = slotsMap.get(key)
    const alt = { id: pm.id, mealId: pm.mealId, mealName: pm.mealName }
    if (existing) {
      existing.alternatives.push(alt)
    } else {
      slotsMap.set(key, {
        dayNumber: pm.dayNumber,
        mealType: pm.mealType,
        mealOrder: pm.mealOrder,
        alternatives: [alt],
      })
    }
  }

  const slots = Array.from(slotsMap.values()).sort(
    (a, b) =>
      a.dayNumber - b.dayNumber ||
      a.mealType.localeCompare(b.mealType) ||
      a.mealOrder - b.mealOrder
  )

  return {
    ...plan,
    slots,
  }
}

export type UpdateDietPlanResult =
  | { ok: true; data: (typeof dietPlan.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'VALIDATION' }

export async function updateDietPlan(
  id: string,
  data: UpdateDietPlan
): Promise<UpdateDietPlanResult> {
  const { name, description, add, remove, update } = data

  // 1. Check plan exists
  const [planRow] = await db.select().from(dietPlan).where(eq(dietPlan.id, id)).limit(1)
  if (!planRow) return { ok: false, error: 'Diet plan not found', code: 'NOT_FOUND' }

  // 2. Validate: dietPlanMealIds in remove/update must belong to this plan
  const idsToCheck = [...(remove ?? []), ...(update ?? []).map((u) => u.dietPlanMealId)]
  if (idsToCheck.length > 0) {
    const existing = await db
      .select({ id: dietPlanMeal.id })
      .from(dietPlanMeal)
      .where(and(eq(dietPlanMeal.dietPlanId, id), inArray(dietPlanMeal.id, idsToCheck)))
    const existingIds = new Set(existing.map((r) => r.id))
    const missing = idsToCheck.filter((mid) => !existingIds.has(mid))
    if (missing.length > 0) {
      return {
        ok: false,
        error: `Diet plan meal(s) not found or do not belong to this plan: ${missing.join(', ')}`,
        code: 'VALIDATION',
      }
    }
  }

  // 3. Validate: no dietPlanMealId in both remove and update
  const removeSet = new Set(remove ?? [])
  const updateIds = (update ?? []).map((u) => u.dietPlanMealId)
  const inBoth = updateIds.filter((mid) => removeSet.has(mid))
  if (inBoth.length > 0) {
    return {
      ok: false,
      error: `Diet plan meal(s) cannot appear in both remove and update: ${inBoth.join(', ')}`,
      code: 'VALIDATION',
    }
  }

  // 4. Validate: all mealIds in add exist
  const mealIdsToAdd = [...new Set((add ?? []).map((a) => a.mealId))]
  if (mealIdsToAdd.length > 0) {
    const existingMeals = await db
      .select({ id: meal.id })
      .from(meal)
      .where(inArray(meal.id, mealIdsToAdd))
    const existingMealIds = new Set(existingMeals.map((r) => r.id))
    const missingMeals = mealIdsToAdd.filter((mid) => !existingMealIds.has(mid))
    if (missingMeals.length > 0) {
      return {
        ok: false,
        error: `Meal(s) not found: ${missingMeals.join(', ')}`,
        code: 'VALIDATION',
      }
    }
  }

  // 5. Apply metadata updates
  const updateData: Record<string, string | null | undefined> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (Object.keys(updateData).length > 0) {
    await db.update(dietPlan).set(updateData).where(eq(dietPlan.id, id))
  }

  // 6. Apply remove (first)
  if (remove && remove.length > 0) {
    await db
      .delete(dietPlanMeal)
      .where(and(eq(dietPlanMeal.dietPlanId, id), inArray(dietPlanMeal.id, remove)))
  }

  // 7. Apply update
  if (update && update.length > 0) {
    for (const u of update) {
      const setData: Record<string, string | number | undefined> = {}
      if (u.mealId !== undefined) setData.mealId = u.mealId
      if (u.dayNumber !== undefined) setData.dayNumber = u.dayNumber
      if (u.mealType !== undefined) setData.mealType = u.mealType
      if (u.mealOrder !== undefined) setData.mealOrder = u.mealOrder
      if (Object.keys(setData).length > 0) {
        await db
          .update(dietPlanMeal)
          .set(setData)
          .where(and(eq(dietPlanMeal.id, u.dietPlanMealId), eq(dietPlanMeal.dietPlanId, id)))
      }
    }
  }

  // 8. Apply add
  if (add && add.length > 0) {
    await db.insert(dietPlanMeal).values(
      add.map((item) => ({
        dietPlanId: id,
        mealId: item.mealId,
        dayNumber: item.dayNumber,
        mealType: item.mealType,
        mealOrder: item.mealOrder ?? 1,
      }))
    )
  }

  const [final] = await db.select().from(dietPlan).where(eq(dietPlan.id, id)).limit(1)
  return { ok: true, data: final! }
}

export async function deleteDietPlan(id: string) {
  const [deleted] = await db.delete(dietPlan).where(eq(dietPlan.id, id)).returning()
  return deleted ?? null
}
