import { db } from '@burn-app/db'
import { foodCategory, foodItem } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq } from 'drizzle-orm'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import type { FoodCategoriesQuery, FoodItemsQuery } from '@/types/api/food.schemas'

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

  const [countResult, items] = await Promise.all([
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

  return {
    items,
    totalItems: countResult[0]?.count ?? 0,
  }
}

export async function getFoodItemById(id: string) {
  const [item] = await db
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
      createdAt: foodItem.createdAt,
      updatedAt: foodItem.updatedAt,
    })
    .from(foodItem)
    .leftJoin(foodCategory, eq(foodItem.categoryId, foodCategory.id))
    .where(eq(foodItem.id, id))
    .limit(1)
  return item ?? null
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

export async function createFoodItem(data: {
  name: string
  categoryId: string
  fdcId?: number
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  servingSize?: number
}) {
  const [newItem] = await db
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
    })
    .returning()
  return newItem ?? null
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
  }
) {
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

  if (Object.keys(updateData).length === 0) return null

  const [updated] = await db
    .update(foodItem)
    .set(updateData)
    .where(eq(foodItem.id, id))
    .returning()
  return updated ?? null
}

export async function deleteFoodItem(id: string) {
  const [deleted] = await db.delete(foodItem).where(eq(foodItem.id, id)).returning()
  return deleted ?? null
}
