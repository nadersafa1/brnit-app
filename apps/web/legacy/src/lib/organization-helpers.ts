import { headers } from 'next/headers'
import { auth } from '@brnit/auth'
import { db } from '@brnit/db'
import * as schema from '@brnit/db/schema/auth'
import { and, eq } from 'drizzle-orm'
import type { OrganizationContext, OrganizationRole } from '@/types/organization'

export type { OrganizationContext, OrganizationRole }

const getRoleFlags = (
  role: OrganizationRole | null
): Pick<
  OrganizationContext,
  | 'isOwner'
  | 'isClientAdmin'
  | 'isDirectAdmin'
  | 'isNutritionist'
  | 'isCoach'
  | 'isMember'
> => {
  return {
    isOwner: role === 'owner',
    isClientAdmin: role === 'client_admin',
    isDirectAdmin: role === 'direct_admin',
    isNutritionist: role === 'nutritionist',
    isCoach: role === 'coach',
    isMember: role === 'member',
  }
}

export async function getOrganizationContext(): Promise<OrganizationContext> {
  const session = await auth.api.getSession({ headers: await headers() })
  const activeOrgId = session?.session.activeOrganizationId ?? null

  if (!session?.user) {
    return {
      organization: null,
      isAuthenticated: false,
      userId: null,
      role: null,
      activeOrgId: null,
      isAppAdmin: false,
      ...getRoleFlags(null),
    }
  }

  if (session.user.role === 'admin') {
    return {
      organization: null,
      role: null,
      activeOrgId,
      isAppAdmin: true,
      isAuthenticated: true,
      userId: session.user.id,
      ...getRoleFlags(null),
    }
  }

  if (activeOrgId) {
    const membership = await db.query.member.findFirst({
      where: and(
        eq(schema.member.userId, session.user.id),
        eq(schema.member.organizationId, activeOrgId)
      ),
    })
    const organization = await db.query.organization.findFirst({
      where: eq(schema.organization.id, activeOrgId),
    })

    if (!membership || !organization) {
      return {
        organization: null,
        isAuthenticated: true,
        userId: session.user.id,
        isAppAdmin: false,
        role: null,
        activeOrgId: null,
        ...getRoleFlags(null),
      }
    }

    return {
      organization,
      role: membership.role as OrganizationRole,
      activeOrgId,
      isAppAdmin: false,
      isAuthenticated: true,
      userId: session.user.id,
      ...getRoleFlags(membership.role as OrganizationRole),
    }
  }

  const userMemberships = await db.query.member.findMany({
    where: eq(schema.member.userId, session.user.id),
  })
  if (userMemberships.length === 1) {
    const membership = userMemberships[0]
    const organization = await db.query.organization.findFirst({
      where: eq(schema.organization.id, membership.organizationId),
    })

    if (!organization || !membership) {
      return {
        organization: null,
        isAuthenticated: true,
        userId: session.user.id,
        isAppAdmin: false,
        role: null,
        activeOrgId: null,
        ...getRoleFlags(null),
      }
    }

    return {
      organization,
      role: membership.role as OrganizationRole,
      activeOrgId: membership.organizationId,
      isAppAdmin: false,
      isAuthenticated: true,
      userId: session.user.id,
      ...getRoleFlags(membership.role as OrganizationRole),
    }
  }

  return {
    organization: null,
    isAuthenticated: true,
    userId: session.user.id,
    isAppAdmin: false,
    role: null,
    activeOrgId: null,
    ...getRoleFlags(null),
  }
}
