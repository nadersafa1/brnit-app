'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { useOrganizationPermissions, useRoles } from '@/hooks/authorization'
import CreateOrgForm from './create-org-form'
import InvitationsList from './invitations-list'
import InviteMemberForm from './invite-member-form'
import MembersList from './members-list'
import OrganizationSelect from './organization-select'

const OrganizationsContent = () => {
  const router = useRouter()
  const [inviteRefetchTrigger, setInviteRefetchTrigger] = useState(0)
  const { canInvite: canInvitePermission } = useOrganizationPermissions()
  const { isAppAdmin } = useRoles()
  const { data: organizations } = authClient.useListOrganizations()
  const { data: activeOrganization } = authClient.useActiveOrganization()

  const activeId = activeOrganization?.id ?? null
  const selectedOrg = organizations?.find((o: { id: string }) => o.id === activeId)
  const canInvite = activeId && selectedOrg && canInvitePermission

  const handleOrgCreated = () => router.refresh()
  const handleInviteSent = () => {
    setInviteRefetchTrigger(n => n + 1)
    router.refresh()
  }

  return (
    <div className='space-y-6'>
      <h2 className='text-lg font-semibold'>Organizations</h2>

      {isAppAdmin && <CreateOrgForm onSuccess={handleOrgCreated} />}

      <OrganizationSelect />

      {activeId && canInvite && (
        <div className='grid gap-6 md:grid-cols-2'>
          <InviteMemberForm organizationId={activeId} onSuccess={handleInviteSent} />
          <InvitationsList organizationId={activeId} refetchTrigger={inviteRefetchTrigger} />
        </div>
      )}

      {activeId && !canInvite && (
        <p className='text-muted-foreground text-sm'>
          Only owners, direct admins, and client admins can invite members. Client admins can only invite as member.
          Your role in this organization does not allow invitations.
        </p>
      )}

      {activeId && <MembersList organizationId={activeId} />}

      {(!organizations || organizations.length === 0) && !isAppAdmin && (
        <p className='text-muted-foreground text-sm'>
          You are not in any organization yet. Ask an admin to invite you.
        </p>
      )}
    </div>
  )
}

export default OrganizationsContent
