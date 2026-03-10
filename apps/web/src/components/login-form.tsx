'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import Loader from '@/components/loader'
import { Flame } from 'lucide-react'

const loginSchema = z.object({
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const GoogleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='size-4'>
    <path
      d='M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z'
      fill='currentColor'
    />
  </svg>
)

const AppleIcon = () => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' className='size-4'>
    <path
      d='M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701'
      fill='currentColor'
    />
  </svg>
)

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
          router.push(redirectTo as any)
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
      {
        onError: ctx => {
          toast.error(ctx.error?.message ?? 'Google sign-in failed')
        },
      }
    )
  }

  const handleAppleSignIn = () => {
    toast.info('Apple Sign In coming soon')
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
              <Link href={signupHref as any} className='underline underline-offset-4 hover:text-primary'>
                Sign up
              </Link>
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input id='email' type='email' placeholder='m@example.com' {...form.register('email')} />
            {form.formState.errors.email && (
              <p className='text-sm text-destructive'>{form.formState.errors.email.message}</p>
            )}
          </Field>
          <Field>
            <div className='flex items-center justify-between'>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Link href='/forgot-password' className='text-xs underline underline-offset-4 hover:text-primary'>
                Forgot password?
              </Link>
            </div>
            <Input id='password' type='password' {...form.register('password')} />
            {form.formState.errors.password && (
              <p className='text-sm text-destructive'>{form.formState.errors.password.message}</p>
            )}
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
