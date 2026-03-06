'use client'

import { useMemo } from 'react'
import { useOrganizationContext } from './use-organization-context'
import {
  hasOrgInvitePermission,
  hasOrgMemberManagementPermission,
} from '@/lib/authorization'

/**
 * Hook to check organization-based permissions.
 * Returns canInvite and canManageMembers based on user role.
 */
export function useOrganizationPermissions() {
  const { context } = useOrganizationContext()

  return useMemo(
    () => ({
      canInvite: hasOrgInvitePermission(context),
      canManageMembers: hasOrgMemberManagementPermission(context),
    }),
    [
      context.isAppAdmin,
      context.isOwner,
      context.isClientAdmin,
      context.isAuthenticated,
    ]
  )
}
