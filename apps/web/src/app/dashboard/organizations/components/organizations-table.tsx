'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Plus } from 'lucide-react'

import { authClient } from '@/lib/auth-client'
import { useRoles } from '@/hooks/authorization'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CreateOrganizationDialog } from './create-organization-dialog'

export default function OrganizationsTable() {
  const router = useRouter()
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const { isAppAdmin } = useRoles()
  const { data: organizations, isPending } = authClient.useListOrganizations()

  const handleView = (orgId: string) => {
    router.push(`/dashboard/organizations/${orgId}`)
  }

  if (isPending) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">Loading organizations...</p>
        </CardContent>
      </Card>
    )
  }

  if (!organizations?.length && !isAppAdmin) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center text-sm">
            You are not in any organization yet. Ask an admin to invite you.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <CreateOrganizationDialog
        open={createOrgOpen}
        onOpenChange={setCreateOrgOpen}
        onSuccess={() => router.refresh()}
      />
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Organizations</CardTitle>
          {isAppAdmin && (
            <Button onClick={() => setCreateOrgOpen(true)} size="sm">
              <Plus className="mr-2 size-4" />
              Create organization
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {organizations?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org: { id: string; name: string; slug?: string }) => (
                  <TableRow
                    key={org.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleView(org.id)}
                  >
                    <TableCell>{org.name}</TableCell>
                    <TableCell>{org.slug ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleView(org.id)
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">No organizations.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
