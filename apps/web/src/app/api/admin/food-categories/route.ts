import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { foodCategory } from '@burn-app/db/schema'
import { count, asc, desc, ilike } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  createFoodCategorySchema,
  foodCategoriesQuerySchema,
} from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = foodCategoriesQuerySchema.safeParse({
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

  const totalItems = countResult[0]?.count ?? 0

  return NextResponse.json(createPaginatedResponse(categories, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createFoodCategorySchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name } = parseResult.data

  const [newCategory] = await db
    .insert(foodCategory)
    .values({ name })
    .returning()

  return NextResponse.json({ data: newCategory }, { status: 201 })
}
