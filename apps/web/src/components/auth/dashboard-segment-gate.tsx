import type { ReactNode } from 'react'

import type { DashboardSegmentGateState } from '@/lib/authorization/dashboard-segment-gate'
import { AccessDeniedCard } from '@/components/auth/access-denied-card'
import { DashboardSegmentGateSkeleton } from '@/components/auth/dashboard-segment-gate-skeleton'

type DashboardSegmentGateProps = Readonly<{
  state: DashboardSegmentGateState
  unauthorizedTitle: string
  unauthorizedDescription: string
  unauthorizedBackHref?: string
  unauthorizedBackLabel?: string
  children?: ReactNode
}>

export function DashboardSegmentGate({
  state,
  unauthorizedTitle,
  unauthorizedDescription,
  unauthorizedBackHref,
  unauthorizedBackLabel,
  children,
}: DashboardSegmentGateProps) {
  if (state === 'loading') {
    return <DashboardSegmentGateSkeleton />
  }

  if (state === 'unauthorized') {
    return (
      <AccessDeniedCard
        title={unauthorizedTitle}
        description={unauthorizedDescription}
        backHref={unauthorizedBackHref}
        backLabel={unauthorizedBackLabel}
      />
    )
  }

  return <>{children ?? null}</>
}
