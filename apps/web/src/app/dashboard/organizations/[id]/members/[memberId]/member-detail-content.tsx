'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'
import { useOrgMembers } from '../../../use-org-members'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreateDietPlanDialog } from '@/app/dashboard/admin/diet-plans/components/create-diet-plan-dialog'
import MemberAssignmentsList from './components/member-assignments-list'
import AssignExistingPlanDialog from './components/assign-existing-plan-dialog'
import { useBodyCompositionAssessments } from '@/hooks/use-body-composition-assessments'
import AssessmentsTable from '@/app/dashboard/direct-admin/members/[memberId]/components/assessments-table'

export default function MemberDetailContent({
  organizationId,
  memberId,
}: {
  organizationId: string
  memberId: string
}) {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()
  const { members, loading: membersLoading } = useOrgMembers(organizationId, 'member')

  const [createPlanOpen, setCreatePlanOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [preselectedPlanId, setPreselectedPlanId] = useState<string | undefined>()

  const member = members.find((m) => m.id === memberId)
  const canAccess = canAccessNutritionistFeatures(session ?? null, context)

  const { data: assessmentsData, isLoading: assessmentsLoading } = useBodyCompositionAssessments(
    {
      memberId,
      perPage: 100,
      sortBy: 'assessedAt',
      sortOrder: 'desc',
    },
    'nutritionist'
  )

  useEffect(() => {
    if (!canAccess) {
      router.replace('/dashboard')
    }
  }, [canAccess, router])

  if (!canAccess) return null
  if (membersLoading && !member) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">Loading...</p>
        </CardContent>
      </Card>
    )
  }
  if (!member) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">
            Member not found or you do not have access.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push(`/dashboard/organizations/${organizationId}`)}
          >
            Back to organization
          </Button>
        </CardContent>
      </Card>
    )
  }

  const name = (member as { user?: { name?: string | null } }).user?.name ?? '—'
  const email = (member as { user?: { email?: string } }).user?.email ?? ''

  const handleCreateSuccessWithPlanId = (planId: string) => {
    setCreatePlanOpen(false)
    setPreselectedPlanId(planId)
    setAssignDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Member</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/organizations/${organizationId}`)}
        >
          Back to organization
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            <span className="font-medium">Name:</span> {name}
          </p>
          <p className="text-sm">
            <span className="font-medium">Email:</span> {email}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Body composition assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessmentsLoading ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading assessments...
            </p>
          ) : (
            <AssessmentsTable
              assessments={assessmentsData?.data ?? []}
              memberId={memberId}
              readOnly
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Diet plan assignments</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPreselectedPlanId(undefined)
                  setAssignDialogOpen(true)
                }}
              >
                Assign existing plan
              </Button>
              <Button
                size="sm"
                onClick={() => setCreatePlanOpen(true)}
              >
                Create and assign
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MemberAssignmentsList
            memberId={memberId}
            organizationId={context.activeOrgId ?? organizationId}
          />
        </CardContent>
      </Card>

      <CreateDietPlanDialog
        open={createPlanOpen}
        onOpenChange={setCreatePlanOpen}
        onSuccessWithPlanId={handleCreateSuccessWithPlanId}
        source="nutritionist"
      />

      <AssignExistingPlanDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        memberId={memberId}
        preselectedPlanId={preselectedPlanId}
        onSuccess={() => setAssignDialogOpen(false)}
      />
    </div>
  )
}
