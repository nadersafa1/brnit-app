import { NextRequest, NextResponse } from 'next/server'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { createMeal, listMeals } from '@/lib/services/meals'
import { mealsQuerySchema, createMealSchema } from '@/types/api/meal.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireNutritionist(request.headers)
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

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listMeals(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireNutritionist(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createMealSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: parseResult.error.flatten() },
      { status: 400 }
    )
  }

  const newMeal = await createMeal(parseResult.data)

  if (!newMeal) {
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }

  return NextResponse.json({ data: newMeal }, { status: 201 })
}
