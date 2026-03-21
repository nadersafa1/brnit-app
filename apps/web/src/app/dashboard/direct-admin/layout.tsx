'use client'

import { DashboardSegmentGate } from '@/components/auth/dashboard-segment-gate'
import { useOrganizationContext } from '@/hooks/authorization'
import { authClient } from '@/lib/auth-client'
import { directAdminSegmentGateState } from '@/lib/authorization/dashboard-segment-gate'

type DirectAdminDashboardLayoutProps = Readonly<{ children: React.ReactNode }>

export default function DirectAdminDashboardLayout({ children }: DirectAdminDashboardLayoutProps) {
  const { data: session, isPending } = authClient.useSession()
  const { context, isLoading: isOrgContextLoading } = useOrganizationContext()

  const state = directAdminSegmentGateState(isPending, isOrgContextLoading, session, {
    isAppAdmin: context.isAppAdmin,
    isDirectAdmin: context.isDirectAdmin,
  })

  return (
    <DashboardSegmentGate
      state={state}
      unauthorizedTitle='Direct admin access required'
      unauthorizedDescription='You do not have permission to view the Direct Admin section.'
    >
      {children}
    </DashboardSegmentGate>
  )
}
