/**
 * Authorization helpers for invitation and org-level checks.
 * Used by beforeCreateInvitation and API routes.
 */

export const ORG_ROLES_CAN_INVITE = ['owner', 'direct_admin'] as const
export const APP_ADMIN_ROLE = 'admin'

export type OrgRolesCanInvite = (typeof ORG_ROLES_CAN_INVITE)[number]

/**
 * Check if a user can invite with any role (including non-member roles).
 * App admins and org owners/direct_admins can invite with any role.
 */
export const ORG_ROLES_CAN_UPDATE_MEMBER_ROLE = ['owner', 'direct_admin'] as const

export type OrgRolesCanUpdateMemberRole =
  (typeof ORG_ROLES_CAN_UPDATE_MEMBER_ROLE)[number]

/**
 * Check if a user can update member roles.
 * App admins and org owners/direct_admins can update roles. Client admins cannot.
 */
export function canUpdateMemberRole(options: {
  appRole?: string | null
  orgRole?: string | null
}): boolean {
  if (options.appRole === APP_ADMIN_ROLE) return true
  if (
    options.orgRole &&
    ORG_ROLES_CAN_UPDATE_MEMBER_ROLE.includes(
      options.orgRole as OrgRolesCanUpdateMemberRole
    )
  ) {
    return true
  }
  return false
}

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
