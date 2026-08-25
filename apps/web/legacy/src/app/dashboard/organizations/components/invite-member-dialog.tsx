'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import InviteMemberForm from '../invite-member-form'

interface InviteMemberDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSuccess?: () => void
  readonly organizationId: string
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  onSuccess,
  organizationId,
}: InviteMemberDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Send an invitation by email. The recipient can join this organization with the selected role.
          </DialogDescription>
        </DialogHeader>
        <InviteMemberForm
          key={open ? 'open' : 'closed'}
          organizationId={organizationId}
          embedded
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
