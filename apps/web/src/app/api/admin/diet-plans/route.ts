import { NextRequest, NextResponse } from 'next/server'
import { db } from '@burn-app/db'
import { dietPlan, dietPlanMeal } from '@burn-app/db/schema'
import { count, asc, desc, ilike } from 'drizzle-orm'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { calculateOffset, combineConditions } from '@/lib/api-helpers/query-builders'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { dietPlansQuerySchema, createDietPlanSchema } from '@/types/api/diet-plan.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = dietPlansQuerySchema.safeParse({
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
    conditions.push(ilike(dietPlan.name, `%${q}%`))
  }
  const where = combineConditions(conditions)

  const sortFieldMap = {
    name: dietPlan.name,
    startDate: dietPlan.startDate,
    endDate: dietPlan.endDate,
    createdAt: dietPlan.createdAt,
  } as const
  const sortColumn = sortFieldMap[sortBy ?? 'createdAt'] ?? dietPlan.createdAt
  const sortDir = sortOrder === 'asc' ? asc : desc

  const [countResult, items] = await Promise.all([
    db.select({ count: count() }).from(dietPlan).where(where),
    db
      .select({
        id: dietPlan.id,
        name: dietPlan.name,
        description: dietPlan.description,
        startDate: dietPlan.startDate,
        endDate: dietPlan.endDate,
        createdAt: dietPlan.createdAt,
        updatedAt: dietPlan.updatedAt,
      })
      .from(dietPlan)
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
  const parseResult = createDietPlanSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, startDate, endDate, dietPlanMeals } = parseResult.data

  const [newPlan] = await db
    .insert(dietPlan)
    .values({ name, description, startDate, endDate })
    .returning()

  if (!newPlan) {
    return NextResponse.json({ error: 'Failed to create diet plan' }, { status: 500 })
  }

  if (dietPlanMeals.length > 0) {
    await db.insert(dietPlanMeal).values(
      dietPlanMeals.map((item) => ({
        dietPlanId: newPlan.id,
        mealId: item.mealId,
        dayNumber: item.dayNumber,
        mealType: item.mealType,
      }))
    )
  }

  return NextResponse.json({ data: newPlan }, { status: 201 })
}
