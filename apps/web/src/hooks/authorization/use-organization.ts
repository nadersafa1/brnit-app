'use client'

import { useOrganizationContext } from './use-organization-context'

export function useOrganization() {
  const { context, isLoading } = useOrganizationContext()

  return {
    organization: context.organization,
    organizationId: context.activeOrgId ?? context.organization?.id ?? null,
    isOwner: context.isOwner,
    isClientAdmin: context.isClientAdmin,
    isLoading,
  }
}
