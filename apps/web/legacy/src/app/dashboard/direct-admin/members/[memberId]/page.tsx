'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo } from 'react'

import EditAssessmentDialog from '@/app/dashboard/direct-admin/members/[memberId]/components/edit-assessment-dialog'
import AddAssessmentDialog from '@/app/dashboard/direct-admin/members/components/add-assessment-dialog'
import { useOrgMembers } from '@/app/dashboard/organizations/use-org-members'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOrganizationContext } from '@/hooks/authorization'
import type { BodyCompositionAssessment } from '@/hooks/use-body-composition-assessments'
import { useBodyCompositionAssessments } from '@/hooks/use-body-composition-assessments'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'
import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import AssessmentsTable from './components/assessments-table'

export default function DirectAdminMemberPage() {
  const params = useParams()
  const memberId = params.memberId as string

  const { context } = useOrganizationContext()
  const activeOrgId = context.activeOrgId ?? null

  const { members } = useOrgMembers(activeOrgId)
  const member = useMemo(
    () =>
      (members ?? []).find((m: Member & { user: User }) => m.id === memberId && m.role === 'member') as
        | (Member & { user: User })
        | undefined,
    [members, memberId]
  )

  const { data: assessmentsData, isLoading } = useBodyCompositionAssessments({
    memberId,
    perPage: 100,
    sortBy: 'assessedAt',
    sortOrder: 'desc',
  })

  const [addOpen, setAddOpen] = useState(false)
  const [editAssessment, setEditAssessment] = useState<BodyCompositionAssessment | null>(null)

  if (!activeOrgId) {
    return (
      <div className='space-y-6'>
        <h2 className='text-lg font-semibold'>Member</h2>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-muted-foreground text-sm'>Select an organization to manage assessments.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!member) {
    return (
      <div className='space-y-6'>
        <Link
          href='/dashboard/direct-admin/members'
          className='text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm'
        >
          <ArrowLeft className='size-4' /> Back to members
        </Link>
        <Card>
          <CardContent className='pt-6'>
            <p className='text-muted-foreground text-sm'>Member not found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const memberName = (member as Member & { user?: { name?: string | null } }).user?.name ?? 'Member'
  const memberEmail = (member as Member & { user?: { email?: string } }).user?.email ?? ''

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='sm' asChild>
          <Link href='/dashboard/direct-admin/members' className='gap-1'>
            <ArrowLeft className='size-4' /> Back to members
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{memberName}</CardTitle>
          <p className='text-muted-foreground text-sm'>{memberEmail}</p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle>Body Composition Assessments</CardTitle>
          <Button size='sm' onClick={() => setAddOpen(true)}>
            Add assessment
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className='text-muted-foreground py-4 text-center text-sm'>Loading assessments...</p>
          ) : (
            <AssessmentsTable
              assessments={assessmentsData?.data ?? []}
              memberId={memberId}
              onEdit={setEditAssessment}
              onDeleteSuccess={() => {}}
            />
          )}
        </CardContent>
      </Card>

      <AddAssessmentDialog member={member} open={addOpen} onOpenChange={setAddOpen} onSuccess={() => {}} />

      <EditAssessmentDialog
        assessment={editAssessment}
        memberId={memberId}
        open={!!editAssessment}
        onOpenChange={open => !open && setEditAssessment(null)}
        onSuccess={() => setEditAssessment(null)}
      />
    </div>
  )
}
