'use client'

import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

const RemoveMemberDialog = ({
  member,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: {
  member: (Member & { user: User }) | null
  organizationId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) => {
  const displayName = member?.user?.name ?? member?.user?.email ?? 'This member'

  const handleConfirm = async () => {
    if (!member) return
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: member.id,
      organizationId,
    })
    if (error) {
      toast.error(error.message ?? 'Failed to remove member')
      return
    }
    toast.success('Member removed')
    onOpenChange(false)
    onSuccess()
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove member</AlertDialogTitle>
          <AlertDialogDescription>
            Remove {displayName} from the organization? They will lose access immediately.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={e => {
              e.preventDefault()
              handleConfirm()
            }}
            className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default RemoveMemberDialog
