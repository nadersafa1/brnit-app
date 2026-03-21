import type { Session } from '@/lib/auth-client'
import { canAccessDirectAdminFeatures } from '@/lib/authorization/direct-admin-access'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'
import type { OrganizationContext } from '@/types/organization'

export type DashboardSegmentGateState = 'loading' | 'unauthorized' | 'ok'

type SessionParam = Session | null | undefined

// Shared gate-state helpers keep role/org checks consistent across dashboard segment layouts.
export function adminSegmentGateState(isSessionPending: boolean, session: SessionParam): DashboardSegmentGateState {
  if (isSessionPending) return 'loading'
  if (session?.user?.role !== 'admin') return 'unauthorized'
  return 'ok'
}

export function nutritionistSegmentGateState(
  isSessionPending: boolean,
  isOrgContextLoading: boolean,
  session: SessionParam,
  context: Pick<OrganizationContext, 'isAppAdmin' | 'isNutritionist' | 'activeOrgId'>
): DashboardSegmentGateState {
  if (isSessionPending || isOrgContextLoading) return 'loading'
  if (!canAccessNutritionistFeatures(session, context)) return 'unauthorized'
  return 'ok'
}

export function directAdminSegmentGateState(
  isSessionPending: boolean,
  isOrgContextLoading: boolean,
  session: SessionParam,
  context: Pick<OrganizationContext, 'isAppAdmin' | 'isDirectAdmin'>
): DashboardSegmentGateState {
  if (isSessionPending || isOrgContextLoading) return 'loading'
  if (!canAccessDirectAdminFeatures(session, context)) return 'unauthorized'
  return 'ok'
}
