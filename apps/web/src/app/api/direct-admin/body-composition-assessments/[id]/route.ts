import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { deleteSuccess } from '@/lib/api-helpers/delete-responses'
import { requireAssessmentWriteAuth } from '@/lib/api-helpers/direct-admin-auth'
import {
  assessmentBelongsToOrg,
  getBodyCompositionAssessmentById,
  updateBodyCompositionAssessment,
  deleteBodyCompositionAssessment,
} from '@/lib/services/body-composition-assessments'
import type {
  DeleteAssessmentResult,
  UpdateAssessmentResult,
} from '@/lib/services/body-composition-assessments'
import { updateBodyCompositionAssessmentFormSchema } from '@/types/api/body-composition-assessment.schemas'

type Params = { params: Promise<{ id: string }> }

const PATCH_SCALAR_FIELDS = [
  'assessedAt',
  'heightCm',
  'bodyFatPercent',
  'weightKg',
  'bmi',
  'muscleMassKg',
  'visceralFatAreaCm2',
  'bodyWaterL',
] as const

/** Parses multipart form for PATCH: scalar fields + optional file and clearImage. */
async function parsePatchForm(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file')
  const clearImageRaw = formData.get('clearImage')
  const parsed: Record<string, unknown> = {}
  for (const key of PATCH_SCALAR_FIELDS) {
    const val = formData.get(key)
    if (typeof val === 'string' && val.trim() !== '') parsed[key] = val
  }
  if (clearImageRaw !== null && clearImageRaw !== undefined) parsed.clearImage = clearImageRaw
  const parseResult = updateBodyCompositionAssessmentFormSchema.safeParse(parsed)
  if (!parseResult.success) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Invalid request body', details: flattenError(parseResult.error) },
        { status: 400 }
      ),
    }
  }
  const uploadFile = file instanceof File && file.size > 0 ? file : undefined
  const clearImage = parseResult.data.clearImage === true
  const hasFormFields = PATCH_SCALAR_FIELDS.some((k) => parsed[k] !== undefined)
  if (!hasFormFields && !uploadFile && !clearImage) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'At least one field, file, or clearImage must be provided for update' },
        { status: 400 }
      ),
    }
  }
  return {
    ok: true as const,
    data: parseResult.data,
    uploadFile,
    clearImage,
  }
}

/**
 * Maps service update/delete error result to API response.
 * Returns null when result is ok (caller should then return success).
 */
function mutationErrorResponse(
  result: UpdateAssessmentResult | DeleteAssessmentResult
): NextResponse | null {
  if (result.ok) return null
  if (result.code === 'NOT_FOUND') return NextResponse.json({ error: result.error }, { status: 404 })
  if (result.code === 'WRONG_ORG') return NextResponse.json({ error: result.error }, { status: 403 })
  return NextResponse.json({ error: result.error }, { status: 400 })
}

export const dynamic = 'force-dynamic'

/** Fetches a single assessment; enforces org ownership. */
export const GET = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params

  const [assessment, belongs] = await Promise.all([
    getBodyCompositionAssessmentById(id),
    assessmentBelongsToOrg(id, organizationId),
  ])
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }
  if (!belongs) {
    return NextResponse.json({ error: 'Assessment does not belong to this organization' }, { status: 403 })
  }
  return NextResponse.json({ data: assessment })
}

export const PATCH = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params
  const parsed = await parsePatchForm(request)
  if (!parsed.ok) return parsed.response

  const result = await updateBodyCompositionAssessment(id, parsed.data, organizationId, {
    file: parsed.uploadFile,
    clearImage: parsed.clearImage,
  })
  if (!result.ok) {
    const err = mutationErrorResponse(result)
    return err ?? NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ data: result.data })
}

export const DELETE = async (request: NextRequest, { params }: Params) => {
  const authResult = await requireAssessmentWriteAuth(request.headers)
  if (authResult.error) return authResult.error

  const organizationId = authResult.context.activeOrgId!
  const { id } = await params
  const result = await deleteBodyCompositionAssessment(id, organizationId)
  const err = mutationErrorResponse(result)
  if (err) return err
  return deleteSuccess()
}
