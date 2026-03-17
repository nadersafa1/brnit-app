import { db } from '@burn-app/db'
import { meal, mealItem, foodItem, foodCategory } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq, and, inArray } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import type { MealsQuery, CreateMeal, UpdateMeal } from '@/types/api/meal.schemas'

/** Lists meals with optional search and sort; count and items are fetched in parallel. */
export async function listMeals(query: MealsQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    conditions.push(ilike(meal.name, `%${q}%`))
  }
  const where = combineConditions(conditions)

  const sortFieldMap = {
    name: meal.name,
    createdAt: meal.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? meal.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, items] = await Promise.all([
    db.select({ count: count() }).from(meal).where(where),
    db
      .select({
        id: meal.id,
        name: meal.name,
        description: meal.description,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })
      .from(meal)
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/**
 * Fetches a single meal by id with its items (food details). Returns null if not found.
 */
export async function getMealById(id: string) {
  const [mealRow] = await db
    .select({
      id: meal.id,
      name: meal.name,
      description: meal.description,
      createdAt: meal.createdAt,
      updatedAt: meal.updatedAt,
    })
    .from(meal)
    .where(eq(meal.id, id))
    .limit(1)

  if (!mealRow) return null

  const mealItems = await db
    .select({
      id: mealItem.id,
      foodItemId: mealItem.foodItemId,
      foodName: foodItem.name,
      categoryName: foodCategory.name,
      quantity: mealItem.quantity,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      unit: foodItem.unit,
      gramsPerUnit: foodItem.gramsPerUnit,
    })
    .from(mealItem)
    .innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
    .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(eq(mealItem.mealId, id))

  return {
    ...mealRow,
    mealItems: mealItems.map((mi) => ({
      id: mi.id,
      foodItemId: mi.foodItemId,
      foodName: mi.foodName,
      categoryName: mi.categoryName,
      quantity: Number(mi.quantity),
      calories: mi.calories ? Number(mi.calories) : null,
      protein: mi.protein ? Number(mi.protein) : null,
      carbs: mi.carbs ? Number(mi.carbs) : null,
      fat: mi.fat ? Number(mi.fat) : null,
      unit: mi.unit ?? '100g',
      gramsPerUnit: mi.gramsPerUnit == null ? null : Number(mi.gramsPerUnit),
    })),
  }
}

/**
 * Creates a meal and its items atomically. Rolls back if any step fails.
 */
export async function createMeal(data: CreateMeal) {
  const { name, description, mealItems } = data

  const newMeal = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(meal).values({ name, description }).returning()
    if (!inserted) return null

    if (mealItems.length > 0) {
      await tx.insert(mealItem).values(
        mealItems.map((item) => ({
          mealId: inserted.id,
          foodItemId: item.foodItemId,
          quantity: item.quantity.toString(),
        }))
      )
    }
    return inserted
  })

  return newMeal
}

export type UpdateMealResult =
  | { ok: true; data: (typeof meal.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'VALIDATION' }

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function validateMealItemIdsInMeal(
  tx: Transaction,
  mealId: string,
  mealItemIdsToCheck: string[]
): Promise<UpdateMealResult | null> {
  if (mealItemIdsToCheck.length === 0) return null
  const existing = await tx
    .select({ id: mealItem.id })
    .from(mealItem)
    .where(and(eq(mealItem.mealId, mealId), inArray(mealItem.id, mealItemIdsToCheck)))
  const existingIds = new Set(existing.map((r) => r.id))
  const missing = mealItemIdsToCheck.filter((mid) => !existingIds.has(mid))
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Meal item(s) not found or do not belong to this meal: ${missing.join(', ')}`,
      code: 'VALIDATION',
    }
  }
  return null
}

function validateRemoveUpdateOverlap(
  remove: string[] | undefined,
  update: UpdateMeal['update']
): UpdateMealResult | null {
  const removeSet = new Set(remove ?? [])
  const updateIds = (update ?? []).map((u) => u.mealItemId)
  const inBoth = updateIds.filter((mid) => removeSet.has(mid))
  if (inBoth.length > 0) {
    return {
      ok: false,
      error: `Meal item(s) cannot appear in both remove and update: ${inBoth.join(', ')}`,
      code: 'VALIDATION',
    }
  }
  return null
}

async function validateFoodItemIdsExist(
  tx: Transaction,
  foodIdsToAdd: string[]
): Promise<UpdateMealResult | null> {
  if (foodIdsToAdd.length === 0) return null
  const existingFood = await tx
    .select({ id: foodItem.id })
    .from(foodItem)
    .where(inArray(foodItem.id, foodIdsToAdd))
  const existingFoodIds = new Set(existingFood.map((r) => r.id))
  const missingFood = foodIdsToAdd.filter((fid) => !existingFoodIds.has(fid))
  if (missingFood.length > 0) {
    return {
      ok: false,
      error: `Food item(s) not found: ${missingFood.join(', ')}`,
      code: 'VALIDATION',
    }
  }
  return null
}

/**
 * Updates meal metadata and/or items (add/remove/update) in a single transaction.
 * Validations run first; on success returns the updated meal row.
 */
export async function updateMeal(id: string, data: UpdateMeal): Promise<UpdateMealResult> {
  const { name, description, add, remove, update } = data

  return db.transaction(async (tx) => {
    const [mealRow] = await tx.select().from(meal).where(eq(meal.id, id)).limit(1)
    if (!mealRow) return { ok: false, error: 'Meal not found', code: 'NOT_FOUND' }

    // Run sync overlap check first; then parallelize independent DB validations.
    const overlapError = validateRemoveUpdateOverlap(remove, update)
    if (overlapError) return overlapError

    const mealItemIdsToCheck = [
      ...(remove ?? []),
      ...(update ?? []).map((u) => u.mealItemId),
    ]
    const foodIdsToAdd = [...new Set((add ?? []).map((a) => a.foodItemId))]
    const [mealItemValidationError, foodValidationError] = await Promise.all([
      validateMealItemIdsInMeal(tx, id, mealItemIdsToCheck),
      validateFoodItemIdsExist(tx, foodIdsToAdd),
    ])
    const validationError = mealItemValidationError ?? foodValidationError
    if (validationError) return validationError

    const updateData: Record<string, string | null | undefined> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (Object.keys(updateData).length > 0) {
      await tx.update(meal).set(updateData).where(eq(meal.id, id))
    }

    if (remove?.length) {
      await tx
        .delete(mealItem)
        .where(and(eq(mealItem.mealId, id), inArray(mealItem.id, remove)))
    }
    if (update?.length) {
      await Promise.all(
        update.map((u) =>
          tx
            .update(mealItem)
            .set({ quantity: u.quantity.toString() })
            .where(and(eq(mealItem.id, u.mealItemId), eq(mealItem.mealId, id)))
        )
      )
    }
    if (add?.length) {
      await tx.insert(mealItem).values(
        add.map((item) => ({
          mealId: id,
          foodItemId: item.foodItemId,
          quantity: item.quantity.toString(),
        }))
      )
    }

    const [final] = await tx.select().from(meal).where(eq(meal.id, id)).limit(1)
    return { ok: true, data: final! }
  })
}

/** Deletes a meal by id. Returns the deleted row or null if not found. */
export async function deleteMeal(id: string) {
  const [deleted] = await db.delete(meal).where(eq(meal.id, id)).returning()
  return deleted ?? null
}
