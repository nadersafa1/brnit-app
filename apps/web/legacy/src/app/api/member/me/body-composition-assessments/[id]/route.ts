import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireMemberOrg } from '@/lib/api-helpers/member-org'
import { getBodyCompositionAssessmentByIdForMember } from '@/lib/services/body-composition-assessments'
import { memberSingleAssessmentQuerySchema } from '@/types/api/body-composition-assessment.schemas'
import { withRequestLogging } from '@/lib/api-helpers/with-request-logging'

type Params = { params: Promise<{ id: string }> }

export const dynamic = 'force-dynamic'

/**
 * GET: Single body-composition assessment for the current member.
 * Requires orgId so we can resolve the member and enforce ownership; returns 404 if not found or not owned.
 */
async function getHandler(request: NextRequest, { params }: Params) {
  const { searchParams } = new URL(request.url)
  const queryResult = memberSingleAssessmentQuerySchema.safeParse({
    orgId: searchParams.get('orgId') ?? undefined,
  })
  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(queryResult.error) },
      { status: 400 }
    )
  }

  const { orgId } = queryResult.data

  // Resolve route params and member context in parallel; neither depends on the other.
  const [resolvedParams, orgResult] = await Promise.all([params, requireMemberOrg(request.headers, { orgId })])
  if (orgResult.error) return orgResult.error

  const assessment = await getBodyCompositionAssessmentByIdForMember(
    resolvedParams.id,
    orgResult.context.memberId,
  )
  if (!assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
  }

  // Attach org from auth context so response matches list-item shape.
  return NextResponse.json({
    data: {
      ...assessment,
      organization: {
        id: orgResult.context.organizationId,
        name: orgResult.context.organization.name,
      },
    },
  })
}

export const GET = withRequestLogging(getHandler)
