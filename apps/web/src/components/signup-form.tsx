'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { authClient } from '@/lib/auth-client'
import { isPastDate } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import Loader from '@/components/loader'

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

const signupSchema = z
  .object({
    name: z.string().min(1, 'Name is required'),
    email: z.email('Invalid email address'),
    dob: z.string().min(1, 'Date of birth is required').refine(isPastDate, 'Enter a valid past date'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof signupSchema>

const getRedirectAfterSignup = (invitationId?: string | null, callbackUrl?: string | null) => {
  if (invitationId) return `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`
  return callbackUrl ?? '/dashboard'
}

export const SignupForm = (
  props: React.ComponentProps<typeof Card> & { invitationId?: string | null; callbackUrl?: string | null }
) => {
  const { invitationId, callbackUrl, ...cardProps } = props
  const router = useRouter()
  const { isPending } = authClient.useSession()
  const redirectTo = getRedirectAfterSignup(invitationId, callbackUrl)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', dob: '', password: '', confirmPassword: '' },
  })

  const onSubmit = form.handleSubmit(async values => {
    await authClient.signUp.email(
      {
        email: values.email,
        password: values.password,
        name: values.name,
        dob: values.dob,
        callbackURL: redirectTo,
      },
      {
        onSuccess: () => {
          router.push(redirectTo as any)
          toast.success('Sign up successful')
        },
        onError: ctx => {
          toast.error(ctx.error?.message ?? ctx.error?.statusText ?? 'Sign up failed')
        },
      }
    )
  })

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

  const loginHref = invitationId
    ? `/login?callbackUrl=${encodeURIComponent('/accept-invitation')}&invitationId=${encodeURIComponent(invitationId)}`
    : '/login'

  return (
    <Card {...cardProps}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Enter your information below to create your account</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor='name'>Full Name</FieldLabel>
              <Input id='name' type='text' placeholder='John Doe' {...form.register('name')} />
              {form.formState.errors.name && (
                <p className='text-sm text-destructive'>{form.formState.errors.name.message}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input id='email' type='email' placeholder='m@example.com' {...form.register('email')} />
              {form.formState.errors.email && (
                <p className='text-sm text-destructive'>{form.formState.errors.email.message}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor='dob'>Date of Birth</FieldLabel>
              <Input id='dob' type='date' {...form.register('dob')} />
              {form.formState.errors.dob && (
                <p className='text-sm text-destructive'>{form.formState.errors.dob.message}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input id='password' type='password' {...form.register('password')} />
              <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              {form.formState.errors.password && (
                <p className='text-sm text-destructive'>{form.formState.errors.password.message}</p>
              )}
            </Field>
            <Field>
              <FieldLabel htmlFor='confirmPassword'>Confirm Password</FieldLabel>
              <Input id='confirmPassword' type='password' {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <p className='text-sm text-destructive'>{form.formState.errors.confirmPassword.message}</p>
              )}
            </Field>
            <Field>
              <Button type='submit' className='w-full' disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating account...' : 'Create Account'}
              </Button>
              <Button variant='outline' type='button' className='w-full' onClick={handleGoogleSignIn}>
                <GoogleIcon />
                Sign up with Google
              </Button>
              <Button variant='outline' type='button' className='w-full' onClick={handleAppleSignIn}>
                <AppleIcon />
                Sign up with Apple
              </Button>
              <FieldDescription className='text-center'>
                Already have an account?{' '}
                <Link href={loginHref as any} className='underline underline-offset-4 hover:text-primary'>
                  Sign in
                </Link>
              </FieldDescription>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
