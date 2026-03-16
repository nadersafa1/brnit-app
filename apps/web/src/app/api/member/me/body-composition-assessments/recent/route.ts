import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireMemberOrg } from '@/lib/api-helpers/member-org'
import { getRecentAssessmentsForMember } from '@/lib/services/body-composition-assessments'
import { memberRecentAssessmentsQuerySchema } from '@/types/api/body-composition-assessment.schemas'

export const dynamic = 'force-dynamic'

/** GET: List current member's recent body-composition assessments for an org (optional orgId, limit). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parseResult = memberRecentAssessmentsQuerySchema.safeParse({
    orgId: searchParams.get('orgId') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  })
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: flattenError(parseResult.error) },
      { status: 400 },
    )
  }

  const orgResult = await requireMemberOrg(request.headers, {
    orgId: parseResult.data.orgId,
  })
  if (orgResult.error) return orgResult.error

  const { context } = orgResult
  const result = await getRecentAssessmentsForMember(parseResult.data, {
    memberId: context.memberId,
    organizationId: context.organizationId,
    organizationName: context.organization.name,
  })

  return NextResponse.json(result)
}
