import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  createDietPlanAssignment,
  listDietPlanAssignments,
} from '@/lib/services/diet-plan-assignments'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'
import {
  createDietPlanAssignmentNutritionistSchema,
  dietPlanAssignmentsQuerySchema,
} from '@/types/api/diet-plan-assignment.schemas'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (!activeOrgId) {
    return apiErrorResponse('Active organization required for listing assignments', 403)
  }

  const { searchParams } = new URL(request.url)
  const parseResult = dietPlanAssignmentsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    memberId: searchParams.get('memberId') ?? undefined,
    userId: searchParams.get('userId') ?? undefined,
    dietPlanId: searchParams.get('dietPlanId') ?? undefined,
    organizationId: activeOrgId,
  })

  if (!parseResult.success) {
    return apiErrorResponse('Invalid query parameters', 400, flattenError(parseResult.error))
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanAssignments(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

const postHandler = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (!activeOrgId) {
    return apiErrorResponse('Active organization required for creating assignments', 403)
  }

  const body = await request.json()
  const parseResult = createDietPlanAssignmentNutritionistSchema.safeParse(body)

  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const result = await createDietPlanAssignment({
    ...parseResult.data,
    organizationId: activeOrgId,
  })

  if (!result.ok) {
    if (result.code === 'OVERLAP') {
      return apiErrorResponse(result.error, 409)
    }
    if (result.code === 'NOT_FOUND') {
      return apiErrorResponse(result.error, 404)
    }
    return apiErrorResponse(result.error, 400)
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}

export const GET = withRequestLogging(getHandler)

export const POST = withRequestLogging(postHandler)
