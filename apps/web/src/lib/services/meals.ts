import { db } from '@burn-app/db'
import {
  computeMealTotalsFromLineItems,
  mealMacroTotalsToMealColumns,
  mealTotalsLinesFromDbRows,
} from '@burn-app/db/meal-totals'
import { meal, mealItem, foodItem, dietPlanMeal, dietPlanAssignment } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq, and, inArray } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import { mapFoodCategoriesSorted } from '@/lib/helpers/food-item-categories'
import { roundNutritionMacroRequired } from '@/lib/helpers/nutrition-numbers'
import type { MealsQuery, CreateMeal, UpdateMeal } from '@/types/api/meal.schemas'

// ---------------------------------------------------------------------------
// Read paths
// ---------------------------------------------------------------------------

/** Lists meals with optional search and sort; count and items are fetched in parallel. */
export async function listMeals(query: MealsQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    conditions.push(ilike(meal.name, `%${q}%`))
  }
  const where = combineConditions(conditions)

  // Total count and page rows are independent; run together to cut round-trips.
  const sortFieldMap = {
    name: meal.name,
    createdAt: meal.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? meal.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, rawItems] = await Promise.all([
    db.select({ count: count() }).from(meal).where(where),
    db
      .select({
        id: meal.id,
        name: meal.name,
        description: meal.description,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFat: meal.totalFat,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })
      .from(meal)
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  const items = rawItems.map((row) => ({
    ...row,
    totalCalories: roundNutritionMacroRequired(row.totalCalories),
    totalProtein: roundNutritionMacroRequired(row.totalProtein),
    totalCarbs: roundNutritionMacroRequired(row.totalCarbs),
    totalFat: roundNutritionMacroRequired(row.totalFat),
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/**
 * Fetches a single meal by id with its items (food details). Returns null if not found.
 * Header row and meal_item lines are loaded in parallel (no cross-FK ordering requirement).
 */
export async function getMealById(id: string) {
  const [mealRows, mealItems] = await Promise.all([
    db
      .select({
        id: meal.id,
        name: meal.name,
        description: meal.description,
        totalCalories: meal.totalCalories,
        totalProtein: meal.totalProtein,
        totalCarbs: meal.totalCarbs,
        totalFat: meal.totalFat,
        createdAt: meal.createdAt,
        updatedAt: meal.updatedAt,
      })
      .from(meal)
      .where(eq(meal.id, id))
      .limit(1),
    db.query.mealItem.findMany({
      where: eq(mealItem.mealId, id),
      columns: {
        id: true,
        foodItemId: true,
        quantity: true,
      },
      with: {
        foodItem: {
          columns: {
            name: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            unit: true,
            gramsPerUnit: true,
          },
          with: {
            foodItemCategories: {
              with: {
                category: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    }),
  ])
  const mealRow = mealRows[0]
  if (!mealRow) return null

  // Header uses stored aggregates; lines still expose per-food macros for editing and breakdown.
  return {
    ...mealRow,
    totalCalories: roundNutritionMacroRequired(mealRow.totalCalories),
    totalProtein: roundNutritionMacroRequired(mealRow.totalProtein),
    totalCarbs: roundNutritionMacroRequired(mealRow.totalCarbs),
    totalFat: roundNutritionMacroRequired(mealRow.totalFat),
    // Normalize DB numerics to API-safe numbers and clamp macro precision for stable UI display.
    mealItems: mealItems.map(mi => ({
      id: mi.id,
      foodItemId: mi.foodItemId,
      foodName: mi.foodItem.name,
      categories: mapFoodCategoriesSorted(mi.foodItem.foodItemCategories),
      quantity: Number(mi.quantity),
      calories: roundNutritionMacroRequired(mi.foodItem.calories),
      protein: roundNutritionMacroRequired(mi.foodItem.protein),
      carbs: roundNutritionMacroRequired(mi.foodItem.carbs),
      fat: roundNutritionMacroRequired(mi.foodItem.fat),
      unit: mi.foodItem.unit ?? '100g',
      gramsPerUnit: mi.foodItem.gramsPerUnit == null ? null : Number(mi.foodItem.gramsPerUnit),
    })),
  }
}

// ---------------------------------------------------------------------------
// Write paths (transactions keep meal + lines + denormalized totals consistent)
// ---------------------------------------------------------------------------

/**
 * Creates a meal and its items atomically. Rolls back if any step fails.
 */
export async function createMeal(data: CreateMeal) {
  const { name, description, mealItems } = data

  const newMeal = await db.transaction(async tx => {
    const [inserted] = await tx.insert(meal).values({ name, description }).returning()
    if (!inserted) return null

    if (mealItems.length > 0) {
      await tx.insert(mealItem).values(
        mealItems.map(item => ({
          mealId: inserted.id,
          foodItemId: item.foodItemId,
          quantity: item.quantity.toString(),
        }))
      )
    }
    // Denormalized totals must match lines before returning (API consumers expect correct totals).
    await recomputeMealTotals(tx, inserted.id)
    const [withTotals] = await tx.select().from(meal).where(eq(meal.id, inserted.id)).limit(1)
    return withTotals ?? inserted
  })

  return newMeal
}

export type UpdateMealResult =
  | { ok: true; data: typeof meal.$inferSelect }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' }

export type DeleteMealResult =
  | { ok: true; data: typeof meal.$inferSelect }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' }

/** Drizzle transaction client (same surface as `db` for queries used here). */
type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * Recomputes `meal.total_*` from current `meal_item` rows joined to `food_item`.
 * Caller must run inside the same transaction as line mutations so readers never see stale totals.
 */
async function recomputeMealTotals(tx: DbClient, mealId: string) {
  const rows = await tx
    .select({
      quantity: mealItem.quantity,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      unit: foodItem.unit,
    })
    .from(mealItem)
    .innerJoin(foodItem, eq(mealItem.foodItemId, foodItem.id))
    .where(eq(mealItem.mealId, mealId))

  const totals = computeMealTotalsFromLineItems(mealTotalsLinesFromDbRows(rows))
  await tx.update(meal).set(mealMacroTotalsToMealColumns(totals)).where(eq(meal.id, mealId))
}

async function validateMealItemIdsInMeal(
  tx: DbClient,
  mealId: string,
  mealItemIdsToCheck: string[]
): Promise<UpdateMealResult | null> {
  if (mealItemIdsToCheck.length === 0) return null
  const existing = await tx
    .select({ id: mealItem.id })
    .from(mealItem)
    .where(and(eq(mealItem.mealId, mealId), inArray(mealItem.id, mealItemIdsToCheck)))
  const existingIds = new Set(existing.map(r => r.id))
  const missing = mealItemIdsToCheck.filter(mid => !existingIds.has(mid))
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
  const updateIds = (update ?? []).map(u => u.mealItemId)
  const inBoth = updateIds.filter(mid => removeSet.has(mid))
  if (inBoth.length > 0) {
    return {
      ok: false,
      error: `Meal item(s) cannot appear in both remove and update: ${inBoth.join(', ')}`,
      code: 'VALIDATION',
    }
  }
  return null
}

async function validateFoodItemIdsExist(tx: DbClient, foodIdsToAdd: string[]): Promise<UpdateMealResult | null> {
  if (foodIdsToAdd.length === 0) return null
  const existingFood = await tx.select({ id: foodItem.id }).from(foodItem).where(inArray(foodItem.id, foodIdsToAdd))
  const existingFoodIds = new Set(existingFood.map(r => r.id))
  const missingFood = foodIdsToAdd.filter(fid => !existingFoodIds.has(fid))
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

  return db.transaction(async tx => {
    // Load header and “assigned plan” conflict probe together; both keys only on `id`.
    const [mealRows, assignedPlanRows] = await Promise.all([
      tx.select().from(meal).where(eq(meal.id, id)).limit(1),
      tx
        .select({ id: dietPlanMeal.id })
        .from(dietPlanMeal)
        .innerJoin(dietPlanAssignment, eq(dietPlanAssignment.dietPlanId, dietPlanMeal.dietPlanId))
        .where(eq(dietPlanMeal.mealId, id))
        .limit(1),
    ])
    const mealRow = mealRows[0]
    if (!mealRow) return { ok: false, error: 'Meal not found', code: 'NOT_FOUND' }
    const mealInAssignedPlan = assignedPlanRows[0]

    // Block edits when this meal appears in any diet plan that has an active assignment.
    if (mealInAssignedPlan) {
      return {
        ok: false,
        error: 'Cannot edit this meal while it is part of a diet plan assigned to a member or user',
        code: 'CONFLICT',
      }
    }

    const overlapError = validateRemoveUpdateOverlap(remove, update)
    if (overlapError) return overlapError

    const mealItemIdsToCheck = [...(remove ?? []), ...(update ?? []).map(u => u.mealItemId)]
    const foodIdsToAdd = [...new Set((add ?? []).map(a => a.foodItemId))]
    // Meal-item ownership and food FK checks do not depend on each other.
    const [mealItemValidationError, foodValidationError] = await Promise.all([
      validateMealItemIdsInMeal(tx, id, mealItemIdsToCheck),
      validateFoodItemIdsExist(tx, foodIdsToAdd),
    ])
    const validationError = mealItemValidationError ?? foodValidationError
    if (validationError) return validationError

    // Order matters: deletes before updates/inserts avoids unique/FK surprises; quantity patches are per-row.
    const updateData: Record<string, string | null | undefined> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (Object.keys(updateData).length > 0) {
      await tx.update(meal).set(updateData).where(eq(meal.id, id))
    }

    if (remove?.length) {
      await tx.delete(mealItem).where(and(eq(mealItem.mealId, id), inArray(mealItem.id, remove)))
    }
    if (update?.length) {
      // Each update targets a distinct `meal_item` id; parallel is safe within the txn.
      await Promise.all(
        update.map(u =>
          tx
            .update(mealItem)
            .set({ quantity: u.quantity.toString() })
            .where(and(eq(mealItem.id, u.mealItemId), eq(mealItem.mealId, id)))
        )
      )
    }
    if (add?.length) {
      await tx.insert(mealItem).values(
        add.map(item => ({
          mealId: id,
          foodItemId: item.foodItemId,
          quantity: item.quantity.toString(),
        }))
      )
    }

    const hadItemMutation =
      (add?.length ?? 0) > 0 || (remove?.length ?? 0) > 0 || (update?.length ?? 0) > 0
    if (hadItemMutation) {
      await recomputeMealTotals(tx, id)
    }

    const [final] = await tx.select().from(meal).where(eq(meal.id, id)).limit(1)
    if (!final) {
      return { ok: false, error: 'Meal not found', code: 'NOT_FOUND' }
    }
    return { ok: true, data: final }
  })
}

/**
 * Deletes a meal by id. Uses a transaction so the existence checks and delete are atomic
 * (avoids a race where items or plan slots appear between read and delete).
 */
export async function deleteMeal(id: string): Promise<DeleteMealResult> {
  return db.transaction(async tx => {
    const [mealRow] = await tx.select({ id: meal.id }).from(meal).where(eq(meal.id, id)).limit(1)
    if (!mealRow) {
      return { ok: false, error: 'Meal not found', code: 'NOT_FOUND' }
    }

    // Item count and plan references are independent probes; both must pass before delete.
    const [[itemCountRow], [referencedByPlan]] = await Promise.all([
      tx.select({ count: count() }).from(mealItem).where(eq(mealItem.mealId, id)),
      tx.select({ id: dietPlanMeal.id }).from(dietPlanMeal).where(eq(dietPlanMeal.mealId, id)).limit(1),
    ])

    const itemCount = Number(itemCountRow?.count ?? 0)
    if (itemCount > 0) {
      return {
        ok: false,
        error: 'Cannot delete a meal that still has meal items; remove them first',
        code: 'CONFLICT',
      }
    }

    if (referencedByPlan) {
      return {
        ok: false,
        error: 'Cannot delete a meal that is used in a diet plan; remove it from the plan first',
        code: 'CONFLICT',
      }
    }

    const [deleted] = await tx.delete(meal).where(eq(meal.id, id)).returning()
    if (!deleted) {
      return { ok: false, error: 'Meal not found', code: 'NOT_FOUND' }
    }
    return { ok: true, data: deleted }
  })
}
