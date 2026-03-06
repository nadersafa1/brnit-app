import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { meal, mealItem } from '@burn-app/db/schema'
import { count, asc, desc, ilike } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { mealsQuerySchema, createMealSchema } from '@/types/api/meal.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = mealsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { page, perPage, q, sortBy, sortOrder } = parseResult.data
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

  const totalItems = countResult[0]?.count ?? 0

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createMealSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, mealItems } = parseResult.data

  const [newMeal] = await db
    .insert(meal)
    .values({ name, description })
    .returning()

  if (!newMeal) {
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }

  if (mealItems.length > 0) {
    await db.insert(mealItem).values(
      mealItems.map((item) => ({
        mealId: newMeal.id,
        foodItemId: item.foodItemId,
        quantity: item.quantity.toString(),
      }))
    )
  }

  return NextResponse.json({ data: newMeal }, { status: 201 })
}
