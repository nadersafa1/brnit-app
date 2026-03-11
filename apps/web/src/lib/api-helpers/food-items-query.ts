import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { foodItemsQuerySchema } from '@/types/api/food.schemas'
import type { FoodItemsQuery } from '@/types/api/food.schemas'

/**
 * Builds and validates food-items list query from request URL search params.
 * Used by member, admin, and nutritionist GET /food-items to avoid duplication.
 */
export function parseFoodItemsQuery(
  request: NextRequest
): { success: true; query: FoodItemsQuery } | { success: false; error: NextResponse } {
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
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
        { status: 400 }
      ),
    }
  }

  return { success: true, query: parseResult.data }
}
