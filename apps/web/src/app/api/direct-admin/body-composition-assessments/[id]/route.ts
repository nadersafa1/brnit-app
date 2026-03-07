import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAssessmentWriteAuth } from '@/lib/api-helpers/direct-admin-auth'
import {
  getBodyCompositionAssessmentById,
  updateBodyCompositionAssessment,
  deleteBodyCompositionAssessment,
} from '@/lib/services/body-composition-assessments'
import { updateBodyCompositionAssessmentFormSchema } from '@/types/api/body-composition-assessment.schemas'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params

  const assessment = await getBodyCompositionAssessmentById(id)
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  const { assessmentBelongsToOrg } = await import('@/lib/services/body-composition-assessments')
  const belongs = await assessmentBelongsToOrg(id, organizationId)
  if (!belongs) {
    return NextResponse.json(
      { error: 'Assessment does not belong to this organization' },
      { status: 403 }
    )
  }

  return NextResponse.json({ data: assessment })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params
  const formData = await request.formData()
  const file = formData.get('file')
  const clearImageRaw = formData.get('clearImage')
  const parsed: Record<string, unknown> = {}
  const formFields = [
    'assessedAt',
    'heightCm',
    'bodyFatPercent',
    'weightKg',
    'bmi',
    'muscleMassKg',
    'visceralFatAreaCm2',
    'bodyWaterL',
  ] as const
  for (const key of formFields) {
    const val = formData.get(key)
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      parsed[key] = val
    }
  }
  if (clearImageRaw !== null && clearImageRaw !== undefined) {
    parsed.clearImage = clearImageRaw
  }
  const parseResult = updateBodyCompositionAssessmentFormSchema.safeParse(parsed)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = parseResult.data.clearImage === true
  const hasFormFields = formFields.some(k => parsed[k] !== undefined)
  if (!hasFormFields && !uploadFile && !clearImage) {
    return NextResponse.json(
      { error: 'At least one field, file, or clearImage must be provided for update' },
      { status: 400 }
    )
  }

  const result = await updateBodyCompositionAssessment(id, parseResult.data, organizationId, {
    file: uploadFile,
    clearImage,
  })

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.code === 'WRONG_ORG') {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ data: result.data })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params

  const result = await deleteBodyCompositionAssessment(id, organizationId)

  if (!result.ok) {
    if (result.code === 'NOT_FOUND') {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.code === 'WRONG_ORG') {
      return NextResponse.json({ error: result.error }, { status: 403 })
    }
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
