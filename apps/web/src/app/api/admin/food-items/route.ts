import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { foodItem, foodCategory } from '@burn-app/db/schema'
import { count, asc, desc, ilike, eq } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { foodItemsQuerySchema, createFoodItemSchema } from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = foodItemsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { page, perPage, q, sortBy, sortOrder, categoryId } = parseResult.data
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

  const totalItems = countResult[0]?.count ?? 0

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createFoodItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, categoryId, fdcId, calories, protein, carbs, fat, servingSize } = parseResult.data

  const [newItem] = await db
    .insert(foodItem)
    .values({
      name,
      categoryId,
      fdcId,
      calories: calories?.toString(),
      protein: protein?.toString(),
      carbs: carbs?.toString(),
      fat: fat?.toString(),
      servingSize: servingSize?.toString(),
    })
    .returning()

  return NextResponse.json({ data: newItem }, { status: 201 })
}
