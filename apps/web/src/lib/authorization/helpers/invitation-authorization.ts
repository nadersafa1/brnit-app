import type { OrganizationContext } from '@/types/organization'
import type { AuthorizationResult } from '../types'
import { forbiddenResponse, unauthorizedResponse, AUTH_ERRORS } from '../types'

/**
 * Check if user is authorized to create an invitation.
 * Allows: app admin, org owner, org client_admin.
 */
export function checkInviteAuthorization(
  context: OrganizationContext,
  organizationId?: string | null
): AuthorizationResult {
  if (!context.isAuthenticated) {
    return unauthorizedResponse(AUTH_ERRORS.UNAUTHORIZED)
  }
  if (context.isAppAdmin) {
    return null
  }
  if (!organizationId || !context.organization?.id) {
    return forbiddenResponse(AUTH_ERRORS.ORG_REQUIRED)
  }
  if (context.organization.id !== organizationId) {
    return forbiddenResponse(AUTH_ERRORS.WRONG_ORG)
  }
  if (context.isOwner || context.isClientAdmin) {
    return null
  }
  return forbiddenResponse(AUTH_ERRORS.FORBIDDEN)
}
