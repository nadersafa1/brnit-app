import { auth } from '@brnit/auth'
import { NextResponse } from 'next/server'
import { getOrganizationContext } from '@/lib/organization-helpers'
import type { OrganizationContext } from '@/types/organization'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type AssessmentWriteAuthResult =
  | { error: NextResponse; session?: never; context?: never }
  | { session: Session; context: OrganizationContext; error?: never }

/**
 * Require assessment write access: app admin, org owner, or direct_admin with active organization.
 * Used for body composition assessment create/update/delete.
 */
export async function requireAssessmentWriteAuth(
  headers: Headers
): Promise<AssessmentWriteAuthResult> {
  const session = await auth.api.getSession({ headers })

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const context = await getOrganizationContext()

  if (context.isAppAdmin || context.isOwner || context.isDirectAdmin) {
    if (!context.activeOrgId) {
      return {
        error: NextResponse.json(
          { error: 'Forbidden: active organization required for this operation' },
          { status: 403 }
        ),
      }
    }
    return { session, context }
  }

  return {
    error: NextResponse.json(
      { error: 'Forbidden: direct admin, owner, or app admin role required' },
      { status: 403 }
    ),
  }
}
