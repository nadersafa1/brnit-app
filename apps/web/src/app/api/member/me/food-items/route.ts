import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { parseFoodItemsQuery } from '@/lib/api-helpers/food-items-query'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { listFoodItems } from '@/lib/services/food'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

/** List food items for the authenticated member (search, filters, pagination). */
const getHandler = async (request: NextRequest) => {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const parsed = parseFoodItemsQuery(request)
  if (!parsed.success) return parsed.error

  const { page, perPage } = parsed.query
  const { items, totalItems } = await listFoodItems(parsed.query)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const GET = withRequestLogging(getHandler)
