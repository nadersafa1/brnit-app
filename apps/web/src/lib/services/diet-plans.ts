import { db } from '@burn-app/db'
import {
  dietPlan,
  dietPlanMeal,
  dietPlanAssignment,
  meal,
  mealItem,
  foodItem,
} from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq, and, inArray } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import type { DietPlansQuery, CreateDietPlan, UpdateDietPlan } from '@/types/api/diet-plan.schemas'
import type { FoodUnit } from '@/types/api/food.schemas'

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
    // Intentional join strategy: slotCount is an aggregate over diet_plan_meal rows.
    // Keeping this grouped join preserves the current SQL shape and performance profile.
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
      slotCount: Number(slotCount) || 0,
    })),
    totalItems: countResult[0]?.count ?? 0,
  }
}

/**
 * Creates a plan and its slots in one transaction so we never persist a plan without its
 * slots if the second insert fails.
 */
export async function createDietPlan(data: CreateDietPlan) {
  const { name, description, dietPlanMeals } = data

  return db.transaction(async (tx) => {
    const [newPlan] = await tx.insert(dietPlan).values({ name, description }).returning()
    if (!newPlan) return null

    if (dietPlanMeals.length > 0) {
      await tx.insert(dietPlanMeal).values(
        dietPlanMeals.map((item) => ({
          dietPlanId: newPlan.id,
          mealId: item.mealId,
          dayNumber: item.dayNumber,
          mealType: item.mealType,
          mealOrder: item.mealOrder ?? 1,
          scheduledTime: item.scheduledTime ?? null,
        }))
      )
    }

    return newPlan
  })
}

export async function getDietPlanById(id: string) {
  // Plan header and meal slots only depend on plan id; fetch concurrently.
  const [planRows, planMeals] = await Promise.all([
    db
      .select({
        id: dietPlan.id,
        name: dietPlan.name,
        description: dietPlan.description,
        createdAt: dietPlan.createdAt,
        updatedAt: dietPlan.updatedAt,
      })
      .from(dietPlan)
      .where(eq(dietPlan.id, id))
      .limit(1),
    // Intentional join strategy: flat slot query with mealName pulled from the joined table in one pass.
    db
      .select({
        id: dietPlanMeal.id,
        mealId: dietPlanMeal.mealId,
        mealName: meal.name,
        dayNumber: dietPlanMeal.dayNumber,
        mealType: dietPlanMeal.mealType,
        mealOrder: dietPlanMeal.mealOrder,
        scheduledTime: dietPlanMeal.scheduledTime,
      })
      .from(dietPlanMeal)
      .innerJoin(meal, eq(dietPlanMeal.mealId, meal.id))
      .where(eq(dietPlanMeal.dietPlanId, id))
      .orderBy(
        asc(dietPlanMeal.dayNumber),
        asc(dietPlanMeal.mealType),
        asc(dietPlanMeal.mealOrder)
      ),
  ])
  const plan = planRows[0]
  if (!plan) return null

  // Batch-load meal lines for all slots (one query; group by mealId in memory).
  const mealIds = [...new Set(planMeals.map((pm) => pm.mealId))]
  type MealItemRow = {
    mealItemId: string
    foodItemId: string
    foodName: string
    quantity: number
    unit: FoodUnit
    gramsPerUnit: number | null
  }
  const mealItemsByMealId = new Map<string, MealItemRow[]>()

  if (mealIds.length > 0) {
    // Intentional join strategy: batch-load all lines for all involved meals in one query.
    const items = await db
      .select({
        mealId: mealItem.mealId,
        mealItemId: mealItem.id,
        foodItemId: mealItem.foodItemId,
        foodName: foodItem.name,
        quantity: mealItem.quantity,
        unit: foodItem.unit,
        gramsPerUnit: foodItem.gramsPerUnit,
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
        unit: row.unit ?? '100g',
        gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
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
      scheduledTime: pm.scheduledTime,
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
  | { ok: false; error: string; code: 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' }

export type DeleteDietPlanResult =
  | { ok: true; data: (typeof dietPlan.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' }

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** True if the plan has at least one member or user assignment. */
export async function dietPlanHasAssignments(
  planId: string,
  client: DbClient | typeof db = db
): Promise<boolean> {
  const [row] = await client
    .select({ id: dietPlanAssignment.id })
    .from(dietPlanAssignment)
    .where(eq(dietPlanAssignment.dietPlanId, planId))
    .limit(1)
  return row != null
}

function validateRemoveUpdateOverlap(
  remove: UpdateDietPlan['remove'],
  update: UpdateDietPlan['update']
): UpdateDietPlanResult | null {
  const removeSet = new Set(remove ?? [])
  const updateIds = (update ?? []).map((u) => u.dietPlanMealId)
  const inBoth = updateIds.filter((mid) => removeSet.has(mid))
  if (inBoth.length === 0) return null
  return {
    ok: false,
    error: `Diet plan meal(s) cannot appear in both remove and update: ${inBoth.join(', ')}`,
    code: 'VALIDATION',
  }
}

async function validateSlotAndMealIdsInPlan(
  tx: DbClient,
  planId: string,
  idsToCheck: string[],
  mealIdsToAdd: string[]
): Promise<{ error: string } | null> {
  const [slotErr, mealErr] = await Promise.all([
    idsToCheck.length > 0
      ? tx
          .select({ id: dietPlanMeal.id })
          .from(dietPlanMeal)
          .where(and(eq(dietPlanMeal.dietPlanId, planId), inArray(dietPlanMeal.id, idsToCheck)))
          .then((existing) => {
            const existingIds = new Set(existing.map((r) => r.id))
            const missing = idsToCheck.filter((mid) => !existingIds.has(mid))
            return missing.length > 0 ? { error: `Diet plan meal(s) not found or do not belong to this plan: ${missing.join(', ')}` } : null
          })
      : Promise.resolve(null),
    mealIdsToAdd.length > 0
      ? tx
          .select({ id: meal.id })
          .from(meal)
          .where(inArray(meal.id, mealIdsToAdd))
          .then((rows) => {
            const existingIds = new Set(rows.map((r) => r.id))
            const missing = mealIdsToAdd.filter((mid) => !existingIds.has(mid))
            return missing.length > 0 ? { error: `Meal(s) not found: ${missing.join(', ')}` } : null
          })
      : Promise.resolve(null),
  ])
  return slotErr ?? mealErr
}

/** Applies slot mutations in FK-safe order: plan metadata → remove slots → patch slots → add slots. */
async function applyDietPlanMutations(
  tx: DbClient,
  planId: string,
  data: UpdateDietPlan
): Promise<void> {
  const { name, description, add, remove, update } = data
  const updateData: Record<string, string | null | undefined> = {}
  if (name !== undefined) updateData.name = name
  if (description !== undefined) updateData.description = description
  if (Object.keys(updateData).length > 0) {
    await tx.update(dietPlan).set(updateData).where(eq(dietPlan.id, planId))
  }
  if (remove?.length) {
    await tx
      .delete(dietPlanMeal)
      .where(and(eq(dietPlanMeal.dietPlanId, planId), inArray(dietPlanMeal.id, remove)))
  }
  if (update?.length) {
    const promises = update
      .map((u) => {
        const setData: Record<string, string | number | null | undefined> = {}
        if (u.mealId !== undefined) setData.mealId = u.mealId
        if (u.dayNumber !== undefined) setData.dayNumber = u.dayNumber
        if (u.mealType !== undefined) setData.mealType = u.mealType
        if (u.mealOrder !== undefined) setData.mealOrder = u.mealOrder
        if (u.scheduledTime !== undefined) setData.scheduledTime = u.scheduledTime
        if (Object.keys(setData).length === 0) return null
        return tx
          .update(dietPlanMeal)
          .set(setData)
          .where(and(eq(dietPlanMeal.id, u.dietPlanMealId), eq(dietPlanMeal.dietPlanId, planId)))
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)
    if (promises.length > 0) await Promise.all(promises)
  }
  if (add?.length) {
    await tx.insert(dietPlanMeal).values(
      add.map((item) => ({
        dietPlanId: planId,
        mealId: item.mealId,
        dayNumber: item.dayNumber,
        mealType: item.mealType,
        mealOrder: item.mealOrder ?? 1,
        scheduledTime: item.scheduledTime ?? null,
      }))
    )
  }
}

/**
 * Updates diet plan metadata and/or slots (add/remove/update) in a single transaction.
 * Validations run first; on success returns the updated plan row. All mutations are atomic.
 */
export async function updateDietPlan(
  id: string,
  data: UpdateDietPlan
): Promise<UpdateDietPlanResult> {
  const { add, remove, update } = data

  return db.transaction(async (tx) => {
    const [planRow] = await tx.select().from(dietPlan).where(eq(dietPlan.id, id)).limit(1)
    if (!planRow) return { ok: false, error: 'Diet plan not found', code: 'NOT_FOUND' }

    // Assigned plans are immutable via this API (members rely on stable structure).
    if (await dietPlanHasAssignments(id, tx)) {
      return {
        ok: false,
        error:
          'Cannot edit a diet plan while it is assigned to a member or user',
        code: 'CONFLICT',
      }
    }

    const overlapError = validateRemoveUpdateOverlap(remove, update)
    if (overlapError) return overlapError

    const idsToCheck = [...(remove ?? []), ...(update ?? []).map((u) => u.dietPlanMealId)]
    const mealIdsToAdd = [...new Set((add ?? []).map((a) => a.mealId))]
    const validationError = await validateSlotAndMealIdsInPlan(tx, id, idsToCheck, mealIdsToAdd)
    if (validationError) return { ok: false, error: validationError.error, code: 'VALIDATION' }

    await applyDietPlanMutations(tx, id, data)

    const [final] = await tx.select().from(dietPlan).where(eq(dietPlan.id, id)).limit(1)
    return { ok: true, data: final! }
  })
}

/**
 * Deletes a diet plan. Transaction keeps the assignment check and delete atomic (no delete
 * if an assignment row is inserted between read and delete).
 */
export async function deleteDietPlan(id: string): Promise<DeleteDietPlanResult> {
  return db.transaction(async (tx) => {
    const [planRows, hasAssignment] = await Promise.all([
      tx.select({ id: dietPlan.id }).from(dietPlan).where(eq(dietPlan.id, id)).limit(1),
      dietPlanHasAssignments(id, tx),
    ])
    const planRow = planRows[0]

    if (!planRow) {
      return { ok: false, error: 'Diet plan not found', code: 'NOT_FOUND' }
    }

    if (hasAssignment) {
      return {
        ok: false,
        error:
          'Cannot delete a diet plan while it is assigned to a member or user',
        code: 'CONFLICT',
      }
    }

    const [deleted] = await tx.delete(dietPlan).where(eq(dietPlan.id, id)).returning()
    if (!deleted) {
      return { ok: false, error: 'Diet plan not found', code: 'NOT_FOUND' }
    }
    return { ok: true, data: deleted }
  })
}
