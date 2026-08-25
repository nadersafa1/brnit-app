'use client'

import { DashboardSegmentGate } from '@/components/auth/dashboard-segment-gate'
import { authClient } from '@/lib/auth-client'
import { adminSegmentGateState } from '@/lib/authorization/dashboard-segment-gate'

type AdminDashboardLayoutProps = Readonly<{ children: React.ReactNode }>

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const { data: session, isPending } = authClient.useSession()
  const state = adminSegmentGateState(isPending, session)

  return (
    <DashboardSegmentGate
      state={state}
      unauthorizedTitle='Admin access required'
      unauthorizedDescription='You do not have permission to view the admin section.'
    >
      {children}
    </DashboardSegmentGate>
  )
}
