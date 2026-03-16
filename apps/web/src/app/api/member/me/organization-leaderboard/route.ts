import { NextRequest, NextResponse } from 'next/server'
import { flattenError } from 'zod'
import { requireMemberOrg } from '@/lib/api-helpers/member-org'
import { getOrganizationLeaderboard } from '@/lib/services/organization-leaderboard'
import { memberLeaderboardQuerySchema } from '@/types/api/member-leaderboard.schemas'

export const dynamic = 'force-dynamic'

/** GET: Organization leaderboard by body-fat % point drop (top 3 + self), optional orgId. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const parseResult = memberLeaderboardQuerySchema.safeParse({
    orgId: searchParams.get('orgId') ?? undefined,
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
  const result = await getOrganizationLeaderboard(
    context.organizationId,
    context.organization.name,
    context.memberId
  )

  return NextResponse.json(result)
}
