import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  logDietPlanMealConsumption,
  listDietPlanMealConsumptions,
} from '@/lib/services/diet-plan-meal-consumption'
import {
  createDietPlanMealConsumptionSchema,
  dietPlanMealConsumptionQuerySchema,
} from '@/types/api/diet-plan-meal-consumption.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = dietPlanMealConsumptionQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    dietPlanAssignmentId: searchParams.get('dietPlanAssignmentId') ?? undefined,
    consumedDateFrom: searchParams.get('consumedDateFrom') ?? undefined,
    consumedDateTo: searchParams.get('consumedDateTo') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanMealConsumptions(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createDietPlanMealConsumptionSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await logDietPlanMealConsumption(parseResult.data)

  if (!result.ok) {
    if (result.code === 'DUPLICATE') {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}
