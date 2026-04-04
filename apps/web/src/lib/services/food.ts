import { db } from '@burn-app/db'
import {
  foodCategory,
  foodItem,
  foodItemCategory,
  mealItem,
  dietPlanMealItemOverride,
  dietPlanMealConsumptionItem,
} from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq, inArray, or } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'
import { mapFoodCategoriesSorted } from '@/lib/helpers/food-item-categories'
import { roundNutritionMacroRequired } from '@/lib/helpers/nutrition-numbers'
import type { FoodCategoriesQuery, FoodItemsQuery, FoodUnit } from '@/types/api/food.schemas'

const FOOD_ITEM_IMAGE_FOLDER = 'food-items'

type DbClient = Parameters<Parameters<typeof db.transaction>[0]>[0]

// ---------------------------------------------------------------------------
// Blocking references (used before mutating items that appear on plans / logs)
// ---------------------------------------------------------------------------

/**
 * Whether the food item is referenced anywhere that blocks in-place edit/delete:
 * meal lines, per-assignment overrides, or consumption log rows.
 * Uses the same DB client as the surrounding transaction when provided (consistent snapshot).
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

/** Public JSON shape for a food item (list + detail + create/update responses). */
export type FoodItemApi = {
  id: string
  name: string
  categories: { id: string; name: string }[]
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: FoodUnit
  gramsPerUnit: number | null
  imageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export type FoodItemUpdateResult =
  | { ok: true; data: FoodItemApi }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION' }

export type FoodItemDeleteResult =
  | { ok: true; data: typeof foodItem.$inferSelect }
  | { ok: false; error: string; code: 'NOT_FOUND' | 'CONFLICT' }

// ---------------------------------------------------------------------------
// Cloudinary image resolution (external I/O — never inside DB transactions)
// ---------------------------------------------------------------------------

/**
 * Resolves the next `imagePublicId` for an update: clear, replace file, or leave unchanged.
 * Deletes the previous Cloudinary asset before uploading a replacement to avoid orphans.
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

// ---------------------------------------------------------------------------
// Category ID validation (junction targets must exist before insert/replace)
// ---------------------------------------------------------------------------

async function foodCategoryIdsExist(
  client: DbClient | typeof db,
  ids: string[]
): Promise<boolean> {
  if (ids.length === 0) return false
  const rows = await client
    .select({ id: foodCategory.id })
    .from(foodCategory)
    .where(inArray(foodCategory.id, ids))
  return rows.length === ids.length
}

// ---------------------------------------------------------------------------
// API row shaping (numeric normalization + categories + image URL)
// ---------------------------------------------------------------------------

type FoodNumericFields = {
  calories: string | number | null | undefined
  protein: string | number | null | undefined
  carbs: string | number | null | undefined
  fat: string | number | null | undefined
  gramsPerUnit: string | number | null | undefined
}

/** DB numerics → API numbers; macro fields clamped for stable JSON/UI. */
function normalizeFoodNumericFields(row: FoodNumericFields) {
  return {
    calories: roundNutritionMacroRequired(row.calories),
    protein: roundNutritionMacroRequired(row.protein),
    carbs: roundNutritionMacroRequired(row.carbs),
    fat: roundNutritionMacroRequired(row.fat),
    gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
  }
}

/** Single mapper for list/detail query rows that include `foodItemCategories`. Omits `imagePublicId` from the API surface (use `imageUrl` only). */
function toFoodItemApi(row: {
  id: string
  name: string
  calories: string | null
  protein: string | null
  carbs: string | null
  fat: string | null
  unit: string
  gramsPerUnit: string | null
  imagePublicId: string | null
  createdAt: Date
  updatedAt: Date
  foodItemCategories: Array<{ category: { id: string; name: string } }>
}): FoodItemApi {
  return {
    id: row.id,
    name: row.name,
    categories: mapFoodCategoriesSorted(row.foodItemCategories),
    ...normalizeFoodNumericFields(row),
    unit: row.unit as FoodUnit,
    imageUrl: row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Food categories (CRUD + list)
// ---------------------------------------------------------------------------

/** Paginated categories with optional text search; count and page share the same filter. */
export async function listFoodCategories(query: FoodCategoriesQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    const pattern = `%${q}%`
    conditions.push(
      or(ilike(foodCategory.name, pattern), ilike(foodCategory.description, pattern))!
    )
  }
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

export async function getFoodCategoryById(id: string) {
  const [category] = await db
    .select()
    .from(foodCategory)
    .where(eq(foodCategory.id, id))
    .limit(1)
  return category ?? null
}

// ---------------------------------------------------------------------------
// Food items — read paths
// ---------------------------------------------------------------------------

/**
 * Paginated food items with optional name search and category filter (M2M: junction subquery).
 * Count query uses the same predicate as the page query.
 */
export async function listFoodItems(query: FoodItemsQuery) {
  const { page, perPage, q, sortBy, sortOrder, categoryId } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) conditions.push(ilike(foodItem.name, `%${q}%`))
  if (categoryId) {
    const foodIdsInCategory = db
      .select({ id: foodItemCategory.foodItemId })
      .from(foodItemCategory)
      .where(eq(foodItemCategory.foodCategoryId, categoryId))
    conditions.push(inArray(foodItem.id, foodIdsInCategory))
  }
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
        calories: true,
        protein: true,
        carbs: true,
        fat: true,
        unit: true,
        gramsPerUnit: true,
        imagePublicId: true,
        createdAt: true,
        updatedAt: true,
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
    }),
  ])

  return {
    items: rows.map((row) => toFoodItemApi(row)),
    totalItems: countResult[0]?.count ?? 0,
  }
}

/** One food item for API consumers; `client` allows reading inside an open transaction. */
export async function getFoodItemById(
  id: string,
  client: DbClient | typeof db = db
): Promise<FoodItemApi | null> {
  const row = await client.query.foodItem.findFirst({
    where: eq(foodItem.id, id),
    columns: {
      id: true,
      name: true,
      calories: true,
      protein: true,
      carbs: true,
      fat: true,
      unit: true,
      gramsPerUnit: true,
      imagePublicId: true,
      createdAt: true,
      updatedAt: true,
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
  })
  if (!row) return null
  return toFoodItemApi(row)
}

// ---------------------------------------------------------------------------
// Food categories — mutations (single statements; no transaction needed)
// ---------------------------------------------------------------------------

export async function createFoodCategory(data: { name: string; description?: string }) {
  const [newCategory] = await db
    .insert(foodCategory)
    .values({
      name: data.name,
      description: data.description?.trim() ? data.description.trim() : null,
    })
    .returning()
  return newCategory ?? null
}

export async function updateFoodCategory(id: string, data: { name: string; description?: string }) {
  const [updated] = await db
    .update(foodCategory)
    .set({
      name: data.name,
      description: data.description?.trim() ? data.description.trim() : null,
    })
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

// ---------------------------------------------------------------------------
// Food items — create / update / delete
// ---------------------------------------------------------------------------

/**
 * Creates a food row plus junction rows in one transaction.
 *
 * Category IDs are validated before Cloudinary so a bad request never uploads an orphan image.
 * Image upload stays outside the DB transaction (external I/O); DB work is all-or-nothing.
 */
export async function createFoodItem(
  data: {
    name: string
    categoryIds: string[]
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    unit?: FoodUnit
    gramsPerUnit?: number | null
  },
  options?: { file?: File }
) {
  if (!(await foodCategoryIdsExist(db, data.categoryIds))) {
    return null
  }

  let imagePublicId: string | null = null
  if (options?.file) {
    const { publicId } = await uploadFileToCloudinary(options.file, FOOD_ITEM_IMAGE_FOLDER)
    imagePublicId = publicId
  }

  return db.transaction(async (tx) => {
    // Insert master row first so junction rows can reference a stable food id.
    const [created] = await tx
      .insert(foodItem)
      .values({
        name: data.name,
        calories: String(data.calories ?? 0),
        protein: String(data.protein ?? 0),
        carbs: String(data.carbs ?? 0),
        fat: String(data.fat ?? 0),
        unit: data.unit ?? '100g',
        gramsPerUnit: data.gramsPerUnit?.toString() ?? null,
        imagePublicId,
      })
      .returning()
    if (!created) return null

    await tx.insert(foodItemCategory).values(
      data.categoryIds.map((foodCategoryId) => ({
        foodItemId: created.id,
        foodCategoryId,
      }))
    )

    return getFoodItemById(created.id, tx)
  })
}

function buildFoodItemUpdatePayload(
  data: {
    name?: string
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    unit?: FoodUnit | null
    gramsPerUnit?: number | null
  },
  newImagePublicId: string | null | undefined
): Record<string, string | number | null | undefined> {
  const updateData: Record<string, string | number | null | undefined> = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.calories !== undefined) updateData.calories = String(data.calories ?? 0)
  if (data.protein !== undefined) updateData.protein = String(data.protein ?? 0)
  if (data.carbs !== undefined) updateData.carbs = String(data.carbs ?? 0)
  if (data.fat !== undefined) updateData.fat = String(data.fat ?? 0)
  if (data.unit !== undefined) updateData.unit = data.unit
  if (data.gramsPerUnit !== undefined)
    updateData.gramsPerUnit = data.gramsPerUnit?.toString() ?? null
  if (newImagePublicId !== undefined) updateData.imagePublicId = newImagePublicId
  return updateData
}

/**
 * Updates scalar columns and/or replaces category links.
 *
 * Flow: (1) load row + blocking refs in parallel, (2) optional category validation, (3) optional
 * Cloudinary, (4) one transaction for column patch + junction replace, (5) reload API shape.
 * Blocking references prevent edits to foods used on meals / plans / logs (product rule).
 */
export async function updateFoodItem(
  id: string,
  data: {
    name?: string
    categoryIds?: string[]
    calories?: number | null
    protein?: number | null
    carbs?: number | null
    fat?: number | null
    unit?: FoodUnit | null
    gramsPerUnit?: number | null
  },
  options?: { file?: File; clearImage?: boolean }
): Promise<FoodItemUpdateResult> {
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

  const wantsCategoryUpdate = data.categoryIds !== undefined
  if (wantsCategoryUpdate && data.categoryIds!.length > 0) {
    if (!(await foodCategoryIdsExist(db, data.categoryIds!))) {
      return { ok: false, error: 'One or more category IDs are invalid', code: 'VALIDATION' }
    }
  }

  const newImagePublicId = await resolveFoodItemImageUpdate(
    existing.imagePublicId,
    options
  )

  const updateData = buildFoodItemUpdatePayload(data, newImagePublicId)

  if (
    Object.keys(updateData).length === 0 &&
    !wantsCategoryUpdate &&
    newImagePublicId === undefined
  ) {
    return { ok: false, error: 'No changes to apply', code: 'VALIDATION' }
  }

  await db.transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.update(foodItem).set(updateData).where(eq(foodItem.id, id))
    }
    if (wantsCategoryUpdate) {
      // Replace-all pattern: clear links then insert validated set (empty array = no categories).
      await tx.delete(foodItemCategory).where(eq(foodItemCategory.foodItemId, id))
      await tx.insert(foodItemCategory).values(
        data.categoryIds!.map((foodCategoryId) => ({
          foodItemId: id,
          foodCategoryId,
        }))
      )
    }
  })

  const full = await getFoodItemById(id)
  if (!full) {
    return { ok: false, error: 'Food item not found', code: 'NOT_FOUND' }
  }
  return { ok: true, data: full }
}

/**
 * Deletes the food item if it exists, is not blocked, and no new references appear in the same txn.
 */
export async function deleteFoodItem(id: string): Promise<FoodItemDeleteResult> {
  return db.transaction(async (tx) => {
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
