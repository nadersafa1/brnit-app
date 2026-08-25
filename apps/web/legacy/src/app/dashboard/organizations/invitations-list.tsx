'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authClient } from '@/lib/auth-client'
import type { Invitation } from 'better-auth/plugins'
import { ORG_INVITE_ROLES } from './invite-member-form'

const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()

const InvitationsList = ({
  organizationId,
  refetchTrigger,
  headerAction,
}: {
  organizationId: string
  refetchTrigger?: number
  headerAction?: ReactNode
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await authClient.organization.listInvitations({
      query: { organizationId },
    })
    if (res?.error) {
      setError(res.error.message ?? 'Failed to load invitations')
      setInvitations([])
    } else {
      setInvitations(res.data)
    }
    setLoading(false)
  }, [organizationId])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations, refetchTrigger])

  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await authClient.organization.cancelInvitation({
        invitationId,
      })
      if (error) {
        toast.error(error.message ?? 'Failed to cancel')
        return
      }
      toast.success('Invitation cancelled')
      fetchInvitations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  const roleLabel = (role: string) => ORG_INVITE_ROLES.find(r => r.value === role)?.label ?? role

  if (loading) return null
  if (error) {
    return (
      <Card>
        <CardHeader className={headerAction ? 'flex flex-row items-center justify-between space-y-0' : undefined}>
          <CardTitle>Pending invitations</CardTitle>
          {headerAction}
        </CardHeader>
        <CardContent>
          <p className='text-destructive text-sm'>{error}</p>
        </CardContent>
      </Card>
    )
  }
  if (!invitations.length && !headerAction) return null

  return (
    <Card>
      <CardHeader className={headerAction ? 'flex flex-row items-center justify-between space-y-0' : undefined}>
        <CardTitle>Pending invitations</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent>
        {invitations.length ? (
          <ul className='space-y-2'>
            {invitations.map(inv => (
              <li key={inv.id} className='flex items-center justify-between rounded-md border px-3 py-2'>
                <span className='text-sm'>
                  {inv.email} · {roleLabel(inv.role)}
                </span>
                <div className='flex items-center gap-2'>
                  <Badge variant='secondary'>{statusLabel(inv.status ?? 'pending')}</Badge>
                  {inv.status === 'pending' && (
                    <Button type='button' variant='ghost' size='sm' onClick={() => cancelInvitation(inv.id)}>
                      Cancel
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-muted-foreground text-sm'>No pending invitations.</p>
        )}
      </CardContent>
    </Card>
  )
}

export default InvitationsList
