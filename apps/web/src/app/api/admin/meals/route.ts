import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { createMeal, listMeals } from '@/lib/services/meals'
import { mealsQuerySchema, createMealSchema } from '@/types/api/meal.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
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
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listMeals(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

const postHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createMealSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const newMeal = await createMeal(parseResult.data)

  if (!newMeal) {
    return NextResponse.json({ error: 'Failed to create meal' }, { status: 500 })
  }

  return NextResponse.json({ data: newMeal }, { status: 201 })
}

export const GET = withRequestLogging(getHandler)

export const POST = withRequestLogging(postHandler)
