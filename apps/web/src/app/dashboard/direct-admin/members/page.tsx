'use client'

import { useMemo, useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { useOrganizationContext } from '@/hooks/authorization'
import { canAccessDirectAdminFeatures } from '@/lib/authorization/direct-admin-access'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import OrganizationSelect from '@/app/dashboard/organizations/organization-select'
import { useOrgMembers } from '@/app/dashboard/organizations/use-org-members'
import DirectAdminMembersTable from '@/app/dashboard/direct-admin/members/components/direct-admin-members-table'
import AddAssessmentDialog from '@/app/dashboard/direct-admin/members/components/add-assessment-dialog'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

export default function DirectAdminMembersPage() {
  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()
  const activeOrgId = context.activeOrgId ?? null

  const { members, loading, error } = useOrgMembers(activeOrgId)
  const membersWithRoleMember = useMemo(
    () => (members ?? []).filter((m: Member & { user: User }) => m.role === 'member'),
    [members]
  )

  const [addAssessmentMember, setAddAssessmentMember] = useState<
    (Member & { user: User }) | null
  >(null)

  const canAccess = canAccessDirectAdminFeatures(session ?? null, context)
  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-sm">
              You do not have access to the Direct Admin section.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activeOrgId) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold">Members</h2>
        <Card>
          <CardHeader>
            <CardTitle>Select organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Select an organization to manage assessments.
            </p>
            <div className="mt-4">
              <OrganizationSelect />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Members</h2>
        <OrganizationSelect />
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">Loading members...</p>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-destructive text-center text-sm">{error}</p>
          </CardContent>
        </Card>
      ) : membersWithRoleMember.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-center text-sm">
              No members with Member role in this organization.
            </p>
          </CardContent>
        </Card>
      ) : (
        <DirectAdminMembersTable
          members={membersWithRoleMember}
          onAddAssessment={setAddAssessmentMember}
        />
      )}

      <AddAssessmentDialog
        member={addAssessmentMember}
        open={!!addAssessmentMember}
        onOpenChange={open => !open && setAddAssessmentMember(null)}
        onSuccess={() => setAddAssessmentMember(null)}
      />
    </div>
  )
}
