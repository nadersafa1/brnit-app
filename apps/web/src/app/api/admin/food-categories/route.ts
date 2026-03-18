import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { createFoodCategory, listFoodCategories } from '@/lib/services/food'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import {
  createFoodCategorySchema,
  foodCategoriesQuerySchema,
} from '@/types/api/food.schemas'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
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
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listFoodCategories(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

const postHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createFoodCategorySchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const newCategory = await createFoodCategory(parseResult.data)

  if (!newCategory) {
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }

  return NextResponse.json({ data: newCategory }, { status: 201 })
}

export const GET = withRequestLogging(getHandler)

export const POST = withRequestLogging(postHandler)
