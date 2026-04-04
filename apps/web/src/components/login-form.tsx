'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { authClient } from '@/lib/auth-client'
import { toastSocialOAuthError } from '@/lib/social-oauth-toast'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AppleIcon, GoogleIcon } from '@/components/social-icons'
import { cn } from '@/lib/utils'
import Loader from '@/components/loader'
import { Flame } from 'lucide-react'

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const EMAIL_NOT_VERIFIED_STATUS = 403

export const LoginForm = ({
  className,
  callbackUrl,
  invitationId,
}: { className?: string; callbackUrl?: string; invitationId?: string } = {}) => {
  const router = useRouter()
  const { isPending } = authClient.useSession()
  const [showEmailNotVerified, setShowEmailNotVerified] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const redirectTo = callbackUrl ?? '/dashboard'
  const signupHref = invitationId
    ? `/signup?invitationId=${encodeURIComponent(invitationId)}&callbackUrl=${encodeURIComponent('/accept-invitation')}`
    : '/signup'

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = form.handleSubmit(async values => {
    setShowEmailNotVerified(false)
    await authClient.signIn.email(
      { email: values.email, password: values.password },
      {
        onSuccess: () => {
          // Assertion required: Next.js typed routes use RouteImpl<string>, not plain string
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- see above
          router.push(redirectTo as Parameters<typeof router.push>[0])
          toast.success('Sign in successful')
        },
        onError: ctx => {
          const isEmailNotVerified = ctx.error?.status === EMAIL_NOT_VERIFIED_STATUS
          if (isEmailNotVerified) {
            setShowEmailNotVerified(true)
          } else {
            toast.error(ctx.error?.message ?? ctx.error?.statusText ?? 'Sign in failed')
          }
        },
      }
    )
  })

  const handleResendVerificationEmail = async () => {
    const email = form.getValues('email')
    if (!email) {
      toast.error('Enter your email above first')
      return
    }
    setIsResending(true)
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: redirectTo ?? '/',
    })
    setIsResending(false)
    if (error) {
      toast.error(error.message ?? 'Failed to send verification email')
      return
    }
    toast.success('Verification email sent. Check your inbox.')
    setShowEmailNotVerified(false)
  }

  const handleGoogleSignIn = () => {
    authClient.signIn.social(
      { provider: 'google', callbackURL: redirectTo },
      { onError: ctx => toastSocialOAuthError(ctx, 'Google') },
    )
  }

  const handleAppleSignIn = () => {
    authClient.signIn.social(
      { provider: 'apple', callbackURL: redirectTo },
      { onError: ctx => toastSocialOAuthError(ctx, 'Apple') },
    )
  }

  if (isPending) return <Loader />

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className='flex flex-col items-center gap-2 text-center'>
            <Link href='/' className='flex flex-col items-center gap-2 font-medium'>
              <div className='flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground'>
                <Flame className='size-5' />
              </div>
              <span className='sr-only'>Brnit</span>
            </Link>
            <h1 className='text-xl font-bold'>Welcome to Brnit</h1>
            <FieldDescription>
              Don&apos;t have an account?{' '}
              <Link
                href={signupHref as Parameters<typeof Link>[0]['href']}
                className='underline underline-offset-4 hover:text-primary'
              >
                Sign up
              </Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input id='email' type='email' placeholder='m@example.com' {...form.register('email')} />
            {form.formState.errors.email && <FieldError>{form.formState.errors.email.message}</FieldError>}
          </Field>
          <Field>
            <div className='flex items-center justify-between'>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Link href='/forgot-password' className='text-xs underline underline-offset-4 hover:text-primary'>
                Forgot password?
              </Link>
            </div>
            <Input id='password' type='password' {...form.register('password')} />
            {form.formState.errors.password && <FieldError>{form.formState.errors.password.message}</FieldError>}
          </Field>
          <Field>
            <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </Field>
          {showEmailNotVerified && (
            <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200'>
              <p className='mb-3'>
                Please verify your email address before signing in. Check your inbox for the verification link.
              </p>
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={isResending}
                onClick={handleResendVerificationEmail}
                className='border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/60 dark:hover:bg-amber-900/40'
              >
                {isResending ? 'Sending...' : 'Resend verification email'}
              </Button>
            </div>
          )}
          <FieldSeparator>Or</FieldSeparator>
          <Field className='grid gap-4 sm:grid-cols-2'>
            <Button variant='outline' type='button' onClick={handleGoogleSignIn}>
              <GoogleIcon />
              Continue with Google
            </Button>
            <Button variant='outline' type='button' onClick={handleAppleSignIn}>
              <AppleIcon />
              Continue with Apple
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}
