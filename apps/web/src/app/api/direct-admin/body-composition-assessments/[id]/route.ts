import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAssessmentWriteAuth } from '@/lib/api-helpers/direct-admin-auth'
import {
  getBodyCompositionAssessmentById,
  updateBodyCompositionAssessment,
  deleteBodyCompositionAssessment,
} from '@/lib/services/body-composition-assessments'
import { updateBodyCompositionAssessmentSchema } from '@/types/api/body-composition-assessment.schemas'

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
  const body = await request.json()
  const parseResult = updateBodyCompositionAssessmentSchema.safeParse(body)

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: flattenError(parseResult.error) },
      { status: 400 }
    )
  }

  const result = await updateBodyCompositionAssessment(id, parseResult.data, organizationId)

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
