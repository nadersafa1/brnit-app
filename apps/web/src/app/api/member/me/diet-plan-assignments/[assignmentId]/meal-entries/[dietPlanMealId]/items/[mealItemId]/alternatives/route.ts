import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { getDisplayedFoodAndQuantityForMealItem } from '@/lib/services/diet-plan-meal-item-override'
import { getFoodItemAlternatives } from '@/lib/services/food-item-alternatives'
import { mealItemAlternativesQuerySchema } from '@/types/api/diet-plan-meal-item-override.schemas'

export const dynamic = 'force-dynamic'

type RouteParams = {
  params: Promise<{
    assignmentId: string
    dietPlanMealId: string
    mealItemId: string
  }>
}

export async function GET(request: NextRequest, context: RouteParams) {
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error

  const { assignmentId, dietPlanMealId, mealItemId } = await context.params
  const { searchParams } = new URL(request.url)
  const parseResult = mealItemAlternativesQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const displayed = await getDisplayedFoodAndQuantityForMealItem(
    authResult.session.user.id,
    assignmentId,
    dietPlanMealId,
    mealItemId
  )

  if (!displayed.ok) {
    if (displayed.code === 'FORBIDDEN') {
      return NextResponse.json({ error: displayed.error }, { status: 403 })
    }
    return NextResponse.json({ error: displayed.error }, { status: 404 })
  }

  const result = await getFoodItemAlternatives(
    displayed.foodItemId,
    displayed.quantity,
    page,
    perPage
  )

  if (!result.ok) {
    if (result.code === 'REFERENCE_NOT_FOUND') {
      return NextResponse.json({ error: 'Food item not found' }, { status: 404 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json(
    createPaginatedResponse(result.items, page, perPage, result.totalItems)
  )
}
