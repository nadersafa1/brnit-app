import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionist } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { listFoodCategories } from '@/lib/services/food'
import { foodCategoriesQuerySchema } from '@/types/api/food.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
  const authResult = await requireNutritionist(request.headers)
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

export const GET = withRequestLogging(getHandler)
