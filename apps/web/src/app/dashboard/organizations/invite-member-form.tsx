'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { useOrganizationContext } from '@/hooks/authorization'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export const ORG_INVITE_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'client_admin', label: 'Client admin' },
  { value: 'direct_admin', label: 'Direct admin' },
  { value: 'nutritionist', label: 'Nutritionist' },
  { value: 'coach', label: 'Coach' },
] as const

const inviteSchema = z.object({
  email: z.email('Invalid email'),
  role: z.enum(['member', 'client_admin', 'direct_admin', 'nutritionist', 'coach']),
})

type InviteMemberFormValues = z.infer<typeof inviteSchema>

const InviteMemberForm = ({ organizationId, onSuccess }: { organizationId: string; onSuccess?: () => void }) => {
  const { context } = useOrganizationContext()
  const canChooseRole = !(context.isClientAdmin && !context.isOwner && !context.isAppAdmin)

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  })

  useEffect(() => {
    if (!canChooseRole) {
      form.setValue('role', 'member')
    }
  }, [canChooseRole, form])

  const onSubmit = form.handleSubmit(async values => {
    try {
      const role = canChooseRole ? values.role : ('member' as const)
      const { error } = await authClient.organization.inviteMember({
        email: values.email,
        role,
        organizationId,
      })
      if (error) {
        toast.error(error.message ?? 'Failed to send invitation')
        return
      }
      toast.success('Invitation sent')
      form.reset({ email: '', role: 'member' })
      onSuccess?.()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send invitation'
      toast.error(message)
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite member</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className='space-y-4'>
          <FieldGroup>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type='email'
                {...form.register('email')}
                placeholder='colleague@example.com'
                aria-invalid={!!form.formState.errors.email}
              />
              <FieldError errors={[form.formState.errors.email]} />
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              {canChooseRole ? (
                <select
                  {...form.register('role')}
                  className={cn(
                    'border-input h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs',
                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none',
                    'disabled:opacity-50 md:text-sm'
                  )}
                  aria-invalid={!!form.formState.errors.role}
                >
                  {ORG_INVITE_ROLES.map(r => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  type="text"
                  value="Member"
                  disabled
                  className="text-muted-foreground"
                />
              )}
              <FieldError errors={[form.formState.errors.role]} />
            </Field>
          </FieldGroup>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Sending…' : 'Send invitation'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default InviteMemberForm
