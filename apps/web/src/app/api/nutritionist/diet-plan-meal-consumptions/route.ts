import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  logDietPlanMealConsumption,
  listDietPlanMealConsumptions,
} from '@/lib/services/diet-plan-meal-consumption'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import {
  createDietPlanMealConsumptionSchema,
  dietPlanMealConsumptionQuerySchema,
} from '@/types/api/diet-plan-meal-consumption.schemas'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
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
    return apiErrorResponse('Invalid query parameters', 400, flattenError(parseResult.error))
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanMealConsumptions(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

const postHandler = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createDietPlanMealConsumptionSchema.safeParse(body)

  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const result = await logDietPlanMealConsumption(parseResult.data)

  if (!result.ok) {
    if (result.code === 'DUPLICATE') {
      return apiErrorResponse(result.error, 409)
    }
    if (result.code === 'OUT_OF_ALLOWED_DATE_RANGE') {
      return apiErrorResponse(
        'consumedAt must not be in the future and must be within the allowed backdate window',
        400,
        { reason: result.error }
      )
    }
    return apiErrorResponse(result.error, 400)
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}

export const GET = withRequestLogging(getHandler)

export const POST = withRequestLogging(postHandler)
