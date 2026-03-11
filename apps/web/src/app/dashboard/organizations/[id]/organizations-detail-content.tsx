'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { useOrganizationPermissions, useRoles } from '@/hooks/authorization'
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'
import { organizationContextKeys } from '@/lib/queries/organization-context'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Plus } from 'lucide-react'
import { InviteMemberDialog } from '../components/invite-member-dialog'
import InvitationsList from '../invitations-list'
import MembersList from '../members-list'
import AssignableMembersTable from './components/assignable-members-table'

export default function OrganizationsDetailContent({
  organizationId,
}: {
  readonly organizationId: string
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { data: activeOrganization } = authClient.useActiveOrganization()
  const { data: organizations } = authClient.useListOrganizations()
  const { context } = useOrganizationContext()
  const { canInvite: canInvitePermission } = useOrganizationPermissions()
  const { isAppAdmin } = useRoles()

  const [inviteRefetchTrigger, setInviteRefetchTrigger] = useState(0)
  const [inviteMemberOpen, setInviteMemberOpen] = useState(false)
  const isNutritionist = canAccessNutritionistFeatures(session ?? null, context)
  const isMemberOfOrg = organizations?.some(
    (o: { id: string }) => o.id === organizationId
  )

  const setActiveAndRefresh = useCallback(async () => {
    await authClient.organization.setActive({ organizationId })
    await queryClient.invalidateQueries({ queryKey: organizationContextKeys.all })
  }, [organizationId, queryClient])

  useEffect(() => {
    if (activeOrganization?.id !== organizationId) {
      setActiveAndRefresh()
    }
  }, [organizationId, activeOrganization?.id, setActiveAndRefresh])

  if (!isMemberOfOrg && organizations?.length) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">
            You do not have access to this organization.
          </p>
          <div className="mt-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/organizations')}>
              Back to organizations
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const canInvite = canInvitePermission && organizationId

  const handleInviteSent = () => {
    setInviteRefetchTrigger((n) => n + 1)
    router.refresh()
  }

  if (isNutritionist && !isAppAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <AssignableMembersTable organizationId={organizationId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Organization</h2>

      {canInvite && (
        <>
          <InviteMemberDialog
            open={inviteMemberOpen}
            onOpenChange={setInviteMemberOpen}
            onSuccess={handleInviteSent}
            organizationId={organizationId}
          />
          <InvitationsList
            organizationId={organizationId}
            refetchTrigger={inviteRefetchTrigger}
            headerAction={
              <Button onClick={() => setInviteMemberOpen(true)} size="sm">
                <Plus className="mr-2 size-4" />
                Invite member
              </Button>
            }
          />
        </>
      )}

      {organizationId && !canInvite && !isAppAdmin && (
        <p className="text-muted-foreground text-sm">
          Only owners, direct admins, and client admins can invite members.
        </p>
      )}

      <MembersList organizationId={organizationId} />
    </div>
  )
}
