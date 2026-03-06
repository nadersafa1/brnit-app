/**
 * Authorization helpers for invitation and org-level checks.
 * Used by beforeCreateInvitation and API routes.
 */

export const ORG_ROLES_CAN_INVITE = ['owner', 'client_admin'] as const
export const APP_ADMIN_ROLE = 'admin'

export type OrgRolesCanInvite = (typeof ORG_ROLES_CAN_INVITE)[number]

/**
 * Check if a user can invite with any role (including non-member roles).
 * App admins and org owners/client_admins can invite with any role.
 */
export function canInviteWithAnyRole(options: {
  appRole?: string | null
  orgRole?: string | null
}): boolean {
  if (options.appRole === APP_ADMIN_ROLE) return true
  if (options.orgRole && ORG_ROLES_CAN_INVITE.includes(options.orgRole as OrgRolesCanInvite)) {
    return true
  }
  return false
}
