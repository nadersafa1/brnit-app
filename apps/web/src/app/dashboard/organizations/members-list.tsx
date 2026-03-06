'use client'

import { useState } from 'react'

import { authClient } from '@/lib/auth-client'
import { useOrganizationPermissions } from '@/hooks/authorization'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ORG_INVITE_ROLES } from './invite-member-form'
import RemoveMemberDialog from './remove-member-dialog'
import UpdateMemberRoleDialog from './update-member-role-dialog'
import { useOrgMembers } from './use-org-members'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

const roleLabel = (role: string) =>
  role === 'owner' ? 'Owner' : (ORG_INVITE_ROLES.find(r => r.value === role)?.label ?? role)

const MembersList = ({ organizationId }: { organizationId: string }) => {
  const { canManageMembers } = useOrganizationPermissions()
  const { data: session } = authClient.useSession()
  const currentUserId = session?.user?.id
  const { members, loading, error, refetch } = useOrgMembers(organizationId)
  const [removeMember, setRemoveMember] = useState<(Member & { user: User }) | null>(null)
  const [roleMember, setRoleMember] = useState<(Member & { user: User }) | null>(null)

  const canManage = canManageMembers

  if (loading) return null
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-destructive text-sm'>{error}</p>
        </CardContent>
      </Card>
    )
  }
  if (!members.length) return null

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                {canManage && <TableHead className='w-[120px]'>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(member => {
                const email = (member as Member & { user?: { email?: string } }).user?.email ?? ''
                const name = (member as Member & { user?: { name?: string | null } }).user?.name ?? ''
                const isSelf = member.userId === currentUserId
                return (
                  <TableRow key={member.id}>
                    <TableCell>{name || '—'}</TableCell>
                    <TableCell>{email || '—'}</TableCell>
                    <TableCell>{roleLabel(member.role)}</TableCell>
                    {canManage && (
                      <TableCell>
                        <div className='flex gap-2'>
                          <Button type='button' variant='ghost' size='sm' onClick={() => setRoleMember(member)}>
                            Change role
                          </Button>
                          {!isSelf && (
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='text-destructive hover:text-destructive'
                              onClick={() => setRemoveMember(member)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RemoveMemberDialog
        member={removeMember}
        organizationId={organizationId}
        open={!!removeMember}
        onOpenChange={open => !open && setRemoveMember(null)}
        onSuccess={refetch}
      />
      <UpdateMemberRoleDialog
        member={roleMember}
        organizationId={organizationId}
        open={!!roleMember}
        onOpenChange={open => !open && setRoleMember(null)}
        onSuccess={refetch}
      />
    </>
  )
}

export default MembersList
