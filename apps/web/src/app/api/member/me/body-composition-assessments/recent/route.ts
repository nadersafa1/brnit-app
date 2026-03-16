import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireAuth } from '@/lib/api-helpers/require-auth'
import { requireMemberOrg } from '@/lib/api-helpers/member-org'
import {
  getRecentAssessmentsForMember,
  getRecentAssessmentsForUserAllOrgs,
} from '@/lib/services/body-composition-assessments'
import { memberRecentAssessmentsQuerySchema } from '@/types/api/body-composition-assessment.schemas'

export const dynamic = 'force-dynamic'

/** GET: Recent body-composition assessments. With orgId: that org only; without orgId: all members linked to the logged-in user. */
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

  const { orgId, limit } = parseResult.data

  // Scope by single org: require membership and return that member's assessments.
  if (orgId) {
    const orgResult = await requireMemberOrg(request.headers, { orgId })
    if (orgResult.error) return orgResult.error
    const result = await getRecentAssessmentsForMember(
      { orgId, limit },
      {
        memberId: orgResult.context.memberId,
        organizationId: orgResult.context.organizationId,
        organizationName: orgResult.context.organization.name,
      }
    )
    return NextResponse.json(result)
  }

  // No orgId: return recent assessments for every member linked to the user (all orgs).
  const authResult = await requireAuth(request.headers)
  if (authResult.error) return authResult.error
  const result = await getRecentAssessmentsForUserAllOrgs(authResult.session.user.id, limit)
  return NextResponse.json(result)
}
