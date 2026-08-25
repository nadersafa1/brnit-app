'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const resetSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormValues = z.infer<typeof resetSchema>

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async values => {
    if (!token) {
      toast.error('Invalid or missing reset link')
      return
    }
    const { error } = await authClient.resetPassword({
      newPassword: values.newPassword,
      token,
    })
    if (error) {
      if (error.code === 'INVALID_TOKEN') {
        toast.error('Reset link is invalid or expired')
      } else {
        toast.error(error.message ?? 'Failed to reset password')
      }
      return
    }
    toast.success('Password reset successful')
    router.push('/login?message=password_reset')
  })

  if (!token) {
    return (
      <div className='bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle className='text-center'>Invalid reset link</CardTitle>
            <CardDescription className='text-center'>
              This reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className='flex justify-center'>
            <Link href='/forgot-password'>
              <Button variant='link' className='text-primary'>
                Request new link
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>Set new password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor='newPassword'>New password</FieldLabel>
                <Input id='newPassword' type='password' {...form.register('newPassword')} />
                {form.formState.errors.newPassword && (
                  <p className='text-sm text-destructive'>{form.formState.errors.newPassword.message}</p>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor='confirmPassword'>Confirm password</FieldLabel>
                <Input id='confirmPassword' type='password' {...form.register('confirmPassword')} />
                {form.formState.errors.confirmPassword && (
                  <p className='text-sm text-destructive'>{form.formState.errors.confirmPassword.message}</p>
                )}
              </Field>
              <Field>
                <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Resetting...' : 'Reset password'}
                </Button>
                <p className='text-center text-sm text-muted-foreground'>
                  <Link href='/login' className='underline underline-offset-4 hover:text-primary'>
                    Back to sign in
                  </Link>
                </p>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className='bg-background flex min-h-svh items-center justify-center p-6'>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
