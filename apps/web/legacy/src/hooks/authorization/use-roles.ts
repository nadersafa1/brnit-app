'use client'

import { useOrganizationContext } from './use-organization-context'

export function useRoles() {
  const { context, isLoading } = useOrganizationContext()

  return {
    isAppAdmin: context.isAppAdmin,
    isOwner: context.isOwner,
    isClientAdmin: context.isClientAdmin,
    isAuthenticated: context.isAuthenticated,
    isLoading,
  }
}
