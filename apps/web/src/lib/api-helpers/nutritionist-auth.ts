import { auth } from '@burn-app/auth'
import { NextResponse } from 'next/server'
import { getOrganizationContext } from '@/lib/organization-helpers'
import type { OrganizationContext } from '@/types/organization'

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>

export type NutritionistAuthResult =
  | { error: NextResponse; session?: never; context?: never }
  | { session: Session; context: OrganizationContext; error?: never }

export async function requireNutritionist(headers: Headers): Promise<NutritionistAuthResult> {
  const session = await auth.api.getSession({ headers })

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  const context = await getOrganizationContext()

  // Admin can use nutritionist endpoints
  if (session.user.role === 'admin') {
    return { session, context }
  }

  // Global nutritionist (user.role) can access without active org
  if (session.user.role === 'nutritionist') {
    return { session, context }
  }

  // Non-admin must be nutritionist in an active organization (org-level role)
  if (!context.activeOrgId || !context.isNutritionist) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: nutritionist role and active organization required' },
        { status: 403 }
      ),
    }
  }

  return { session, context }
}

export async function requireNutritionistOrgContext(
  headers: Headers
): Promise<NutritionistAuthResult> {
  const result = await requireNutritionist(headers)
  if (result.error) return result

  // Admin bypasses org requirement
  if (result.session.user.role === 'admin') return result

  // Global nutritionist without org: reject (need org for this operation)
  if (result.session.user.role === 'nutritionist' && !result.context.activeOrgId) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: active organization required for this operation' },
        { status: 403 }
      ),
    }
  }

  return result
}
