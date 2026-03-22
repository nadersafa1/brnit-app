import { db } from '@burn-app/db'
import {
  foodCategory,
  foodItem,
  mealItem,
  dietPlanMealItemOverride,
  dietPlanMealConsumptionItem,
} from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'
import {
  roundNutritionMacroNullable,
  roundNutritionMacroRequired,
} from '@/lib/helpers/nutrition-numbers'
import type { FoodCategoriesQuery, FoodItemsQuery, FoodUnit } from '@/types/api/food.schemas'

const FOOD_ITEM_IMAGE_FOLDER = 'food-items'

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * True if the food item is referenced anywhere that would block delete/update (meal lines,
 * per-assignment overrides, or logged consumption rows). Uses the same client as the
 * surrounding transaction when provided so checks participate in the same snapshot.
 */
export async function foodItemHasBlockingReferences(
  foodItemId: string,
  client: DbClient | typeof db = db
): Promise<boolean> {
  const [mealRef, overrideRef, consumptionRef] = await Promise.all([
    client
      .select({ id: mealItem.id })
      .from(mealItem)
      .where(eq(mealItem.foodItemId, foodItemId))
      .limit(1),
    client
      .select({ id: dietPlanMealItemOverride.id })
      .from(dietPlanMealItemOverride)
      .where(eq(dietPlanMealItemOverride.foodItemId, foodItemId))
      .limit(1),
    client
      .select({ id: dietPlanMealConsumptionItem.id })
      .from(dietPlanMealConsumptionItem)
      .where(eq(dietPlanMealConsumptionItem.foodItemId, foodItemId))
      .limit(1),
  ])
  return mealRef[0] != null || overrideRef[0] != null || consumptionRef[0] != null
}

export type FoodItemUpdateSuccess = Omit<(typeof foodItem.$inferSelect), 'gramsPerUnit'> & {
  gramsPerUnit: number | null
  imageUrl: string | null
}

export type FoodItemUpdateResult =
  | { ok: true; data: FoodItemUpdateSuccess }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' }

export type FoodItemDeleteResult =
  | { ok: true; data: (typeof foodItem.$inferSelect) }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' }

/**
 * Resolves new image public ID for a food item update: clear image, replace with file, or leave unchanged.
 * Delete (when applicable) must run before upload so we don't orphan the previous asset.
 */
async function resolveFoodItemImageUpdate(
  existingPublicId: string | null,
  options?: { file?: File; clearImage?: boolean }
): Promise<string | null | undefined> {
  if (options?.clearImage) {
    if (existingPublicId) await deleteCloudinaryImage(existingPublicId)
    return null
  }
  if (options?.file) {
    if (existingPublicId) await deleteCloudinaryImage(existingPublicId)
    const { publicId } = await uploadFileToCloudinary(options.file, FOOD_ITEM_IMAGE_FOLDER)
    return publicId
  }
  return undefined
}

// --- Food categories (list, get by id, crud) ---

/** List categories with optional search and sort. Count and rows run in parallel. */
export async function listFoodCategories(query: FoodCategoriesQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) conditions.push(ilike(foodCategory.name, `%${q}%`))
  const where = combineConditions(conditions)

  const sortFieldMap = {
    name: foodCategory.name,
    createdAt: foodCategory.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'name'] ?? foodCategory.name
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, categories] = await Promise.all([
    db.select({ count: count() }).from(foodCategory).where(where),
    db
      .select()
      .from(foodCategory)
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  return {
    items: categories,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/** Fetch a single category by id. Returns null if not found. */
export async function getFoodCategoryById(id: string) {
  const [category] = await db
    .select()
    .from(foodCategory)
    .where(eq(foodCategory.id, id))
    .limit(1)
  return category ?? null
}

type FoodNumericFields = {
  calories: string | number | null | undefined
  protein: string | number | null | undefined
  carbs: string | number | null | undefined
  fat: string | number | null | undefined
  servingSize: string | number | null | undefined
  gramsPerUnit: string | number | null | undefined
}

/** Converts DB numeric columns into API-safe numbers; macros are rounded to 2 decimals. */
function normalizeFoodNumericFields(row: FoodNumericFields) {
  return {
    calories: roundNutritionMacroRequired(row.calories),
    protein: roundNutritionMacroNullable(row.protein),
    carbs: roundNutritionMacroNullable(row.carbs),
    fat: roundNutritionMacroNullable(row.fat),
    servingSize: row.servingSize == null ? null : Number(row.servingSize),
    gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
  }
}

// --- Food items (list, get by id, crud) ---

/** List food items with optional search, category filter, and sort. Count and rows run in parallel. */
export async function listFoodItems(query: FoodItemsQuery) {
  const { page, perPage, q, sortBy, sortOrder, categoryId } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) conditions.push(ilike(foodItem.name, `%${q}%`))
  if (categoryId) conditions.push(eq(foodItem.categoryId, categoryId))
  const where = combineConditions(conditions)

  const sortFieldMap = {
    name: foodItem.name,
    calories: foodItem.calories,
    protein: foodItem.protein,
    carbs: foodItem.carbs,
    fat: foodItem.fat,
    createdAt: foodItem.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? foodItem.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, rows] = await Promise.all([
    db.select({ count: count() }).from(foodItem).where(where),
    db.query.foodItem.findMany({
      where,
      orderBy: [sortDir(sortColumn)],
      limit: perPage,
      offset,
      columns: {
        id: true,
        name: true,
        fdcId: true,
        categoryId: true,
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        servingSize: true,
        unit: true,
        gramsPerUnit: true,
        imagePublicId: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        category: {
          columns: { name: true },
        },
      },
    }),
  ])

  // Normalize DB numerics to API-safe numbers; only macro fields are precision-clamped.
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    fdcId: row.fdcId,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    ...normalizeFoodNumericFields(row),
    unit: row.unit,
    imageUrl: row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

/** Fetch a single food item by id with category name and image URL. Returns null if not found. */
export async function getFoodItemById(id: string) {
  const row = await db.query.foodItem.findFirst({
    where: eq(foodItem.id, id),
    columns: {
      id: true,
      name: true,
      fdcId: true,
      categoryId: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      servingSize: true,
      unit: true,
      gramsPerUnit: true,
      imagePublicId: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      category: {
        columns: { name: true },
      },
    },
  })
  if (!row) return null
  const { category, ...food } = row
  return {
    ...food,
    categoryName: category?.name ?? null,
    ...normalizeFoodNumericFields(food),
    imageUrl: food.imagePublicId ? buildCloudinaryUrl(food.imagePublicId) : null,
  }
}

// --- Category crud (single-statement; no transaction) ---

export async function createFoodCategory(data: { name: string }) {
  const [newCategory] = await db
    .insert(foodCategory)
    .values({ name: data.name })
    .returning()
  return newCategory ?? null
}

export async function updateFoodCategory(id: string, data: { name: string }) {
  const [updated] = await db
    .update(foodCategory)
    .set({ name: data.name })
    .where(eq(foodCategory.id, id))
    .returning()
  return updated ?? null
}

export async function deleteFoodCategory(id: string) {
  const [deleted] = await db
    .delete(foodCategory)
    .where(eq(foodCategory.id, id))
    .returning()
  return deleted ?? null
}

// --- Food item crud ---

/**
 * Create a food item. Uploads image first if provided; then single insert (no DB transaction:
 * Cloudinary runs first so we never insert a row without a successful upload when a file is given).
 * API layer enforces required macros (calories, protein, carbs, fat) via schema.
 */
export async function createFoodItem(
  data: {
    name: string
    categoryId: string
    fdcId?: number
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    servingSize?: number
    unit?: FoodUnit
    gramsPerUnit?: number | null
  },
  options?: { file?: File }
) {
  let imagePublicId: string | null = null
  if (options?.file) {
    const { publicId } = await uploadFileToCloudinary(options.file, FOOD_ITEM_IMAGE_FOLDER)
    imagePublicId = publicId
  }
  const [created] = await db
    .insert(foodItem)
    .values({
      name: data.name,
      categoryId: data.categoryId,
      fdcId: data.fdcId,
      calories: data.calories?.toString(),
      protein: data.protein?.toString(),
      carbs: data.carbs?.toString(),
      fat: data.fat?.toString(),
      servingSize: data.servingSize?.toString(),
      unit: data.unit ?? '100g',
      gramsPerUnit: data.gramsPerUnit?.toString() ?? null,
      imagePublicId,
    })
    .returning()
  if (!created) return null
  return {
    ...created,
    gramsPerUnit: created.gramsPerUnit == null ? null : Number(created.gramsPerUnit),
    imageUrl: created.imagePublicId ? buildCloudinaryUrl(created.imagePublicId) : null,
  }
}

function buildFoodItemUpdatePayload(
  data: {
    name?: string
    categoryId?: string
    fdcId?: number | null
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    servingSize?: number | null
    unit?: FoodUnit | null
    gramsPerUnit?: number | null
  },
  newImagePublicId: string | null | undefined
): Record<string, string | number | null | undefined> {
  const updateData: Record<string, string | number | null | undefined> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId
  if (data.fdcId !== undefined) updateData.fdcId = data.fdcId
  if (data.calories !== undefined) updateData.calories = data.calories?.toString() ?? null
  if (data.protein !== undefined) updateData.protein = data.protein?.toString() ?? null
  if (data.carbs !== undefined) updateData.carbs = data.carbs?.toString() ?? null
  if (data.fat !== undefined) updateData.fat = data.fat?.toString() ?? null
  if (data.servingSize !== undefined)
    updateData.servingSize = data.servingSize?.toString() ?? null
  if (data.unit !== undefined) updateData.unit = data.unit
  if (data.gramsPerUnit !== undefined)
    updateData.gramsPerUnit = data.gramsPerUnit?.toString() ?? null
  if (newImagePublicId !== undefined) updateData.imagePublicId = newImagePublicId
  return updateData
}

/**
 * Update a food item. Order: load row → block if referenced → Cloudinary (external) → single DB update.
 * Not wrapped in a DB transaction because Cloudinary is outside the database; blocking checks run
 * before any side effects outside the DB.
 */
export async function updateFoodItem(
  id: string,
  data: {
    name?: string
    categoryId?: string
    fdcId?: number | null
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    servingSize?: number | null
    unit?: FoodUnit | null
    gramsPerUnit?: number | null
  },
  options?: { file?: File; clearImage?: boolean }
): Promise<FoodItemUpdateResult> {
  // Existence + blocking-reference checks are independent, so run them together.
  const [existingRows, hasBlockingRefs] = await Promise.all([
    db
      .select({ imagePublicId: foodItem.imagePublicId })
      .from(foodItem)
      .where(eq(foodItem.id, id))
      .limit(1),
    foodItemHasBlockingReferences(id),
  ])
  const existing = existingRows[0]

  if (!existing) {
    return { ok: false, error: 'Food item not found', code: 'NOT_FOUND' }
  }

  if (hasBlockingRefs) {
    return {
      ok: false,
      error:
        'Cannot edit this food item while it is used in meals, diet plan overrides, or consumption logs',
      code: 'CONFLICT',
    }
  }

  const newImagePublicId = await resolveFoodItemImageUpdate(
    existing.imagePublicId,
    options
  )

  const updateData = buildFoodItemUpdatePayload(data, newImagePublicId)
  if (Object.keys(updateData).length === 0) {
    return { ok: false, error: 'No changes to apply', code: 'VALIDATION' }
  }

  const [updated] = await db
    .update(foodItem)
    .set(updateData)
    .where(eq(foodItem.id, id))
    .returning()
  if (!updated) {
    return { ok: false, error: 'Food item not found', code: 'NOT_FOUND' }
  }
  return {
    ok: true,
    data: {
      ...updated,
      gramsPerUnit: updated.gramsPerUnit == null ? null : Number(updated.gramsPerUnit),
      imageUrl: updated.imagePublicId ? buildCloudinaryUrl(updated.imagePublicId) : null,
    },
  }
}

/**
 * Delete a food item. Transaction ties existence + blocking checks + delete so the row cannot
 * gain a new reference between validation and delete.
 */
export async function deleteFoodItem(id: string): Promise<FoodItemDeleteResult> {
  return db.transaction(async (tx) => {
    // Keep read validations in one transaction snapshot and parallelize independent lookups.
    const [rows, hasBlockingRefs] = await Promise.all([
      tx.select({ id: foodItem.id }).from(foodItem).where(eq(foodItem.id, id)).limit(1),
      foodItemHasBlockingReferences(id, tx),
    ])
    const row = rows[0]

    if (!row) {
      return { ok: false, error: 'Food item not found', code: 'NOT_FOUND' }
    }

    if (hasBlockingRefs) {
      return {
        ok: false,
        error:
          'Cannot delete this food item while it is used in meals, diet plan overrides, or consumption logs',
        code: 'CONFLICT',
      }
    }

    const [deleted] = await tx.delete(foodItem).where(eq(foodItem.id, id)).returning()
    if (!deleted) {
      return { ok: false, error: 'Food item not found', code: 'NOT_FOUND' }
    }
    return { ok: true, data: deleted }
  })
}
