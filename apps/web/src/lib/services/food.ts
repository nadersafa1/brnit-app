import { db } from '@burn-app/db'
import { foodCategory, foodItem } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import {
  buildCloudinaryUrl,
  deleteCloudinaryImage,
  uploadFileToCloudinary,
} from '@/lib/cloudinary-utils'
import type { FoodCategoriesQuery, FoodItemsQuery } from '@/types/api/food.schemas'

const FOOD_ITEM_IMAGE_FOLDER = 'food-items'

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

export async function listFoodCategories(query: FoodCategoriesQuery) {
  const { page, perPage, q, sortBy, sortOrder } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    conditions.push(ilike(foodCategory.name, `%${q}%`))
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

export async function listFoodItems(query: FoodItemsQuery) {
  const { page, perPage, q, sortBy, sortOrder, categoryId } = query
  const offset = calculateOffset(page, perPage)

  const conditions = []
  if (q) {
    conditions.push(ilike(foodItem.name, `%${q}%`))
  }
  if (categoryId) {
    conditions.push(eq(foodItem.categoryId, categoryId))
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
    db
      .select({
        id: foodItem.id,
        name: foodItem.name,
        fdcId: foodItem.fdcId,
        categoryId: foodItem.categoryId,
        categoryName: foodCategory.name,
        calories: foodItem.calories,
        protein: foodItem.protein,
        carbs: foodItem.carbs,
        fat: foodItem.fat,
        servingSize: foodItem.servingSize,
        imagePublicId: foodItem.imagePublicId,
        createdAt: foodItem.createdAt,
        updatedAt: foodItem.updatedAt,
      })
      .from(foodItem)
      .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
      .where(where)
      .orderBy(sortDir(sortColumn))
      .limit(perPage)
      .offset(offset),
  ])

  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    fdcId: row.fdcId,
    categoryId: row.categoryId,
    categoryName: row.categoryName,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    servingSize: row.servingSize,
    imageUrl: row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }))

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function getFoodItemById(id: string) {
  const [row] = await db
    .select({
      id: foodItem.id,
      name: foodItem.name,
      fdcId: foodItem.fdcId,
      categoryId: foodItem.categoryId,
      categoryName: foodCategory.name,
      calories: foodItem.calories,
      protein: foodItem.protein,
      carbs: foodItem.carbs,
      fat: foodItem.fat,
      servingSize: foodItem.servingSize,
      imagePublicId: foodItem.imagePublicId,
      createdAt: foodItem.createdAt,
      updatedAt: foodItem.updatedAt,
    })
    .from(foodItem)
    .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(eq(foodItem.id, id))
    .limit(1)
  if (!row) return null
  return {
    ...row,
    imageUrl: row.imagePublicId ? buildCloudinaryUrl(row.imagePublicId) : null,
  }
}

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
      imagePublicId,
    })
    .returning()
  if (!created) return null
  return {
    ...created,
    imageUrl: created.imagePublicId ? buildCloudinaryUrl(created.imagePublicId) : null,
  }
}

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
  },
  options?: { file?: File; clearImage?: boolean }
) {
  const existing = await db
    .select({ imagePublicId: foodItem.imagePublicId })
    .from(foodItem)
    .where(eq(foodItem.id, id))
    .limit(1)
    .then((rows) => rows[0] ?? null)
  if (!existing) return null

  const newImagePublicId = await resolveFoodItemImageUpdate(
    existing.imagePublicId,
    options
  )

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
  if (newImagePublicId !== undefined) updateData.imagePublicId = newImagePublicId

  if (Object.keys(updateData).length === 0) return null

  const [updated] = await db
    .update(foodItem)
    .set(updateData)
    .where(eq(foodItem.id, id))
    .returning()
  if (!updated) return null
  return {
    ...updated,
    imageUrl: updated.imagePublicId ? buildCloudinaryUrl(updated.imagePublicId) : null,
  }
}

export async function deleteFoodItem(id: string) {
  const [deleted] = await db.delete(foodItem).where(eq(foodItem.id, id)).returning()
  return deleted ?? null
}
