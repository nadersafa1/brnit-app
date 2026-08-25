import { NextResponse } from 'next/server'
import { auth } from '@brnit/auth'
import { db } from '@brnit/db'
import { member, organization } from '@brnit/db/schema'
import { and, eq } from 'drizzle-orm'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type MemberOrgContext = {
  session: Session
  organizationId: string
  memberId: string
  organization: { id: string; name: string }
}

export type RequireMemberOrgResult =
  | { error: NextResponse; context?: never }
  | { context: MemberOrgContext; error?: never }

/**
 * Resolves organization scope for member endpoints: optional orgId param or
 * session's active organization. Ensures the current user is a member of the
 * resolved org.
 */
export async function requireMemberOrg(
  headers: Headers,
  options: { orgId?: string | null } = {}
): Promise<RequireMemberOrgResult> {
  // Authenticate and resolve effective org (param or session active org).
  const session = await auth.api.getSession({ headers })
  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const effectiveOrgId =
    options.orgId != null && options.orgId !== ''
      ? options.orgId
      : session.session?.activeOrganizationId ?? null

  if (!effectiveOrgId) {
    return {
      error: NextResponse.json(
        {
          error: 'Organization context required',
          code: 'NO_ORGANIZATION',
          message: 'Provide orgId query parameter or set an active organization.',
        },
        { status: 400 }
      ),
    }
  }

  // Fetch membership and organization in parallel; both are required to allow access.
  const [membershipResult, orgResult] = await Promise.all([
    db
      .select({
        id: member.id,
        organizationId: member.organizationId,
      })
      .from(member)
      .where(
        and(
          eq(member.userId, session.user.id),
          eq(member.organizationId, effectiveOrgId)
        )
      )
      .limit(1),
    db
      .select({ id: organization.id, name: organization.name })
      .from(organization)
      .where(eq(organization.id, effectiveOrgId))
      .limit(1),
  ])

  const membership = membershipResult[0]
  const org = orgResult[0]

  if (!membership || !org) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden',
          code: 'NOT_MEMBER',
          message: 'You are not a member of this organization.',
        },
        { status: 403 }
      ),
    }
  }

  return {
    context: {
      session,
      organizationId: membership.organizationId,
      memberId: membership.id,
      organization: { id: org.id, name: org.name },
    },
  }
}
