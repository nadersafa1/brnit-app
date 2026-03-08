import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  createDietPlanAssignment,
  listDietPlanAssignments,
} from '@/lib/services/diet-plan-assignments'
import {
  createDietPlanAssignmentNutritionistSchema,
  dietPlanAssignmentsQuerySchema,
} from '@/types/api/diet-plan-assignment.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'Active organization required for listing assignments' },
      { status: 403 }
    )
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
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listDietPlanAssignments(parseResult.data)

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const POST = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const activeOrgId = authResult.context?.activeOrgId ?? null
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'Active organization required for creating assignments' },
      { status: 403 }
    )
  }

  const body = await request.json()
  const parseResult = createDietPlanAssignmentNutritionistSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await createDietPlanAssignment({
    ...parseResult.data,
    organizationId: activeOrgId,
  })

  if (!result.ok) {
    if (result.code === 'OVERLAP') {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}
