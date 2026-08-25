'use client'

import { DashboardSegmentGate } from '@/components/auth/dashboard-segment-gate'
import { useOrganizationContext } from '@/hooks/authorization'
import { authClient } from '@/lib/auth-client'
import { nutritionistSegmentGateState } from '@/lib/authorization/dashboard-segment-gate'

type NutritionistDashboardLayoutProps = Readonly<{ children: React.ReactNode }>

export default function NutritionistDashboardLayout({ children }: NutritionistDashboardLayoutProps) {
  const { data: session, isPending } = authClient.useSession()
  const { context, isLoading: isOrgContextLoading } = useOrganizationContext()

  const state = nutritionistSegmentGateState(isPending, isOrgContextLoading, session, {
    isAppAdmin: context.isAppAdmin,
    isNutritionist: context.isNutritionist,
    activeOrgId: context.activeOrgId,
  })

  return (
    <DashboardSegmentGate
      state={state}
      unauthorizedTitle='Nutritionist access required'
      unauthorizedDescription='You do not have permission to view the nutritionist section.'
    >
      {children}
    </DashboardSegmentGate>
  )
}
