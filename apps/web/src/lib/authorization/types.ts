import type { OrganizationContext } from '@/types/organization'

/**
 * Standard authorization check result.
 * Returns Response if unauthorized, null if authorized.
 */
export type AuthorizationResult = ReturnType<typeof Response.json> | null

/**
 * Standard error messages for authorization
 */
export const AUTH_ERRORS = {
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  ORG_REQUIRED: 'Active organization required',
  WRONG_ORG: 'Resource belongs to a different organization',
} as const

/**
 * Helper to create unauthorized response
 */
export function unauthorizedResponse(
  message: string = AUTH_ERRORS.UNAUTHORIZED
): Response {
  return Response.json({ message }, { status: 401 })
}

/**
 * Helper to create forbidden response
 */
export function forbiddenResponse(
  message: string = AUTH_ERRORS.FORBIDDEN
): Response {
  return Response.json({ message }, { status: 403 })
}

/**
 * Helper to create not found response
 */
export function notFoundResponse(
  message: string = AUTH_ERRORS.NOT_FOUND
): Response {
  return Response.json({ message }, { status: 404 })
}

/**
 * Check if user is app admin
 */
export function isAppAdmin(context: OrganizationContext): boolean {
  return context.isAppAdmin
}

const hasOrgAdminRole = (ctx: OrganizationContext): boolean =>
  ctx.isAppAdmin || ctx.isOwner || ctx.isClientAdmin

/**
 * Check if user can invite members (app admin or org owner/client_admin)
 */
export const hasOrgInvitePermission = hasOrgAdminRole

/**
 * Check if user can manage members (app admin or org owner/client_admin)
 */
export const hasOrgMemberManagementPermission = hasOrgAdminRole
