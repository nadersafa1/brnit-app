import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireNutritionistOrgContext } from '@/lib/api-helpers/nutritionist-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import { listBodyCompositionAssessments } from '@/lib/services/body-composition-assessments'
import { bodyCompositionAssessmentsQuerySchema } from '@/types/api/body-composition-assessment.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

export const dynamic = 'force-dynamic'

const getHandler = async (request: NextRequest) => {
  const authResult = await requireNutritionistOrgContext(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { searchParams } = new URL(request.url)
  const parseResult = bodyCompositionAssessmentsQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    perPage: searchParams.get('perPage') ?? searchParams.get('limit') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    memberId: searchParams.get('memberId') ?? undefined,
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const { page, perPage } = parseResult.data
  const { items, totalItems } = await listBodyCompositionAssessments(
    parseResult.data,
    organizationId
  )

  return NextResponse.json(createPaginatedResponse(items, page, perPage, totalItems))
}

export const GET = withRequestLogging(getHandler)
