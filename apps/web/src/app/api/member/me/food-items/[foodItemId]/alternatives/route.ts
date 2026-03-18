import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { getFoodItemAlternatives } from '@/lib/services/food-item-alternatives'
import { foodItemAlternativesQuerySchema } from '@/types/api/food.schemas'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

async function getHandler(
  request: NextRequest,
  { params }: { params: Promise<{ foodItemId: string }> }
) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { foodItemId } = await params
  const { searchParams } = new URL(request.url)
  const parseResult = foodItemAlternativesQuerySchema.safeParse({
    quantity: searchParams.get('quantity') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { quantity, page, perPage } = parseResult.data
  const result = await getFoodItemAlternatives(foodItemId, quantity, page, perPage)

  if (!result.ok) {
    if (result.code === 'REFERENCE_NOT_FOUND') {
      return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
    }
    return NextResponse.json(
      { error: result.error },
      { status: 400 }
    )
  }

  return NextResponse.json(
    createPaginatedResponse(result.items, page, perPage, result.totalItems)
  )
}

export const GET = withRequestLogging(getHandler)
