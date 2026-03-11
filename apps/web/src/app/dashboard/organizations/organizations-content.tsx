'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Plus } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { useOrganizationPermissions, useRoles } from '@/hooks/authorization'
import { Button } from '@/components/ui/button'
import { CreateOrganizationDialog } from './components/create-organization-dialog'
import { InviteMemberDialog } from './components/invite-member-dialog'
import InvitationsList from './invitations-list'
import MembersList from './members-list'
import OrganizationSelect from './organization-select'

const OrganizationsContent = () => {
  const router = useRouter()
  const [inviteRefetchTrigger, setInviteRefetchTrigger] = useState(0)
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
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
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>Organizations</h2>
        {isAppAdmin && (
          <Button onClick={() => setCreateOrgOpen(true)}>
            <Plus className='mr-2 size-4' />
            Create organization
          </Button>
        )}
      </div>

      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSuccess={handleOrgCreated}
      />

      <OrganizationSelect />

      {activeId && canInvite && (
        <div className='space-y-4'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-medium'>Invitations</h3>
            <Button onClick={() => setInviteMemberOpen(true)} size='sm'>
              <Plus className='mr-2 size-4' />
              Invite member
            </Button>
          </div>
          <InviteMemberDialog
            open={inviteMemberOpen}
            onOpenChange={setInviteMemberOpen}
            onSuccess={handleInviteSent}
            organizationId={activeId}
          />
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
