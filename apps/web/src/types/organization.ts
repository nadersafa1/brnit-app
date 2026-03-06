/**
 * Organization role and context types.
 * Brnit roles: owner, client_admin, direct_admin, nutritionist, coach, member.
 */

export type OrganizationRole =
  | 'owner'
  | 'client_admin'
  | 'direct_admin'
  | 'nutritionist'
  | 'coach'
  | 'member'

export interface OrganizationContext {
  organization: {
    id: string
    name: string
    slug: string
    logo?: string | null
    createdAt: Date
  } | null
  role: OrganizationRole | null
  activeOrgId: string | null
  userId: string | null
  isAppAdmin: boolean
  isOwner: boolean
  isClientAdmin: boolean
  isDirectAdmin: boolean
  isNutritionist: boolean
  isCoach: boolean
  isMember: boolean
  isAuthenticated: boolean
}

export const DEFAULT_ORGANIZATION_CONTEXT: OrganizationContext = {
  organization: null,
  role: null,
  activeOrgId: null,
  userId: null,
  isAppAdmin: false,
  isOwner: false,
  isClientAdmin: false,
  isDirectAdmin: false,
  isNutritionist: false,
  isCoach: false,
  isMember: false,
  isAuthenticated: false,
}
