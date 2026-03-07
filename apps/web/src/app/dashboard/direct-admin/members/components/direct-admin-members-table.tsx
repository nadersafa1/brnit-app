'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ORG_INVITE_ROLES } from '@/app/dashboard/organizations/invite-member-form'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

const roleLabel = (role: string) =>
  role === 'owner' ? 'Owner' : ORG_INVITE_ROLES.find(r => r.value === role)?.label ?? role

interface DirectAdminMembersTableProps {
  members: (Member & { user: User })[]
  onAddAssessment: (member: Member & { user: User }) => void
}

export default function DirectAdminMembersTable({
  members,
  onAddAssessment,
}: DirectAdminMembersTableProps) {
  return (
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
              <TableHead className="w-[220px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map(member => {
              const email = (member as Member & { user?: { email?: string } }).user?.email ?? ''
              const name = (member as Member & { user?: { name?: string | null } }).user?.name ?? ''
              return (
                <TableRow key={member.id}>
                  <TableCell>{name || '—'}</TableCell>
                  <TableCell>{email || '—'}</TableCell>
                  <TableCell>{roleLabel(member.role)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddAssessment(member)}
                      >
                        Add assessment
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/direct-admin/members/${member.id}`}>
                          View assessments
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
