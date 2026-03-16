'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { isPastDate } from '@/lib/date-utils'

const COMPLETE_PROFILE_DOB_ERROR = 'Failed to save date of birth'

const schema = z.object({
  dob: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(isPastDate, 'Enter a valid past date'),
})

type FormValues = z.infer<typeof schema>

/** Result shape from authClient.updateUser when it returns an error. */
type UpdateUserErrorResult = { error: { message?: string } }

export function CompleteProfileForm({ callbackUrl }: Readonly<{ callbackUrl: string }>) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { dob: '' },
  })

  const onSubmit = form.handleSubmit(async values => {
    try {
      const result = await authClient.updateUser({ dob: values.dob } as never)
      const err = (result as UpdateUserErrorResult | undefined)?.error
      if (err) {
        toast.error(err.message ?? COMPLETE_PROFILE_DOB_ERROR)
        return
      }
      toast.success('Profile updated')
      router.push(callbackUrl as never)
    } catch {
      toast.error(COMPLETE_PROFILE_DOB_ERROR)
    }
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Complete your profile</CardTitle>
        <CardDescription>Date of birth is required before using the app.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='dob'>Date of Birth</FieldLabel>
              <Input id='dob' type='date' {...form.register('dob')} />
              {form.formState.errors.dob && (
                <p className='text-sm text-destructive'>{form.formState.errors.dob.message}</p>
              )}
            </Field>
            <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Saving...' : 'Continue'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
