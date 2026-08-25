import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { apiErrorResponse } from '@/lib/api-helpers/api-error-response'
import { requireAdmin } from '@/lib/api-helpers/admin-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { listDietPlans, createDietPlan } from '@/lib/services/diet-plans'
import { dietPlansQuerySchema, createDietPlanSchema } from '@/types/api/diet-plan.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const { searchParams } = new URL(request.url)
  const parseResult = dietPlansQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    q: searchParams.get('q') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
  })

  if (!parseResult.success) {
    return apiErrorResponse('Invalid query parameters', 400, flattenError(parseResult.error))
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlans(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

const postHandler = async (request: NextRequest) => {
  const authResult = await requireAdmin(request.headers)
  if (authResult.error) return authResult.error

  const body = await request.json()
  const parseResult = createDietPlanSchema.safeParse(body)

  if (!parseResult.success) {
    return apiErrorResponse('Invalid request body', 400, flattenError(parseResult.error))
  }

  const newPlan = await createDietPlan(parseResult.data)

  if (!newPlan) {
    return apiErrorResponse('Failed to create diet plan', 500)
  }

  return NextResponse.json({ data: newPlan }, { status: 201 })
}

export const GET = withRequestLogging(getHandler)

export const POST = withRequestLogging(postHandler)
