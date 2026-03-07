import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAssessmentWriteAuth } from '@/lib/api-helpers/direct-admin-auth'
import { createPaginatedResponse } from '@/lib/api-helpers/pagination'
import {
  createBodyCompositionAssessment,
  listBodyCompositionAssessments,
} from '@/lib/services/body-composition-assessments'
import {
  createBodyCompositionAssessmentFormSchema,
  bodyCompositionAssessmentsQuerySchema,
} from '@/types/api/body-composition-assessment.schemas'

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
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

export const POST = async (request: NextRequest) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const recordedById = authResult.session.user.id

  const formData = await request.formData()
  const file = formData.get('file')
  const parsed = {
    memberId: formData.get('memberId') ?? '',
    assessedAt: formData.get('assessedAt') ?? '',
    heightCm: formData.get('heightCm') ?? '',
    bodyFatPercent: formData.get('bodyFatPercent') ?? '',
    weightKg: formData.get('weightKg') ?? '',
    bmi: formData.get('bmi') ?? '',
    muscleMassKg: formData.get('muscleMassKg') ?? '',
    visceralFatAreaCm2: formData.get('visceralFatAreaCm2') ?? '',
    bodyWaterL: formData.get('bodyWaterL') ?? '',
  }
  const parseResult = createBodyCompositionAssessmentFormSchema.safeParse(parsed)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const result = await createBodyCompositionAssessment(
    parseResult.data,
    recordedById,
    organizationId,
    { file: uploadFile }
  )

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.code === 'WRONG_ORG') {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data }, { status: 201 })
}
