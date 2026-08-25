'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ORG_INVITE_ROLES } from './invite-member-form'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

const updateRoleSchema = z.object({
  role: z.enum(['member', 'client_admin', 'direct_admin', 'nutritionist', 'coach']),
})

type UpdateRoleFormValues = z.infer<typeof updateRoleSchema>

const UpdateMemberRoleDialog = ({
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
  const form = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: { role: 'member' },
  })

  const resetForMember = (m: (Member & { user: User }) | null) => {
    if (m) form.reset({ role: (m.role as UpdateRoleFormValues['role']) ?? 'member' })
  }

  const handleOpenChange = (next: boolean) => {
    if (next && member) resetForMember(member)
    onOpenChange(next)
  }

  const onSubmit = form.handleSubmit(async values => {
    if (!member) return
    const { error } = await authClient.organization.updateMemberRole({
      memberId: member.id,
      organizationId,
      role: values.role,
    })
    if (error) {
      toast.error(error.message ?? 'Failed to update role')
      return
    }
    toast.success('Role updated')
    onOpenChange(false)
    onSuccess()
  })

  const displayName = member?.user?.name ?? member?.user?.email ?? 'Member'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {displayName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <Select
                value={form.watch('role')}
                onValueChange={v => form.setValue('role', v as UpdateRoleFormValues['role'])}
              >
                <SelectTrigger className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORG_INVITE_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[form.formState.errors.role]} />
            </Field>
          </FieldGroup>
          <DialogFooter className='mt-4'>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default UpdateMemberRoleDialog
