import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { createFoodItem, listFoodItems } from '@/lib/services/food'
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
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listFoodItems(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createFoodItemSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { name, categoryId, fdcId, calories, protein, carbs, fat, servingSize } =
    parseResult.data

  const newItem = await createFoodItem({
    name,
    categoryId,
    fdcId,
    calories,
    protein,
    carbs,
    fat,
    servingSize,
  })

  if (!newItem) {
    return NextResponse.json({ error: 'Failed to create food item' }, { status: 500 })
  }

  return NextResponse.json({ data: newItem }, { status: 201 })
}
