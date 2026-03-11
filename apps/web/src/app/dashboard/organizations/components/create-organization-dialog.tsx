'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CreateOrgForm from '../create-org-form'

interface CreateOrganizationDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSuccess?: () => void
}

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const handleSuccess = () => {
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Add a new organization. You can switch to it after creation.
          </DialogDescription>
        </DialogHeader>
        <CreateOrgForm
          key={open ? 'open' : 'closed'}
          embedded
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  )
}
