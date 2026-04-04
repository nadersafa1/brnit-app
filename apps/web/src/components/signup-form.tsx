'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

import { authClient } from '@/lib/auth-client'
import { toastSocialOAuthError } from '@/lib/social-oauth-toast'
import { isPastDate } from '@/lib/date-utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AppleIcon, GoogleIcon } from '@/components/social-icons'
import Loader from '@/components/loader'

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
        dob: new Date(values.dob),
        callbackURL: redirectTo,
      },
      {
        onSuccess: () => {
          // Typed routes expect RouteImpl; redirectTo is a valid app path string
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- see above
          router.push(redirectTo as Parameters<typeof router.push>[0])
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
              {form.formState.errors.name && <FieldError>{form.formState.errors.name.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor='email'>Email</FieldLabel>
              <Input id='email' type='email' placeholder='m@example.com' {...form.register('email')} />
              {form.formState.errors.email && <FieldError>{form.formState.errors.email.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor='dob'>Date of Birth</FieldLabel>
              <Input id='dob' type='date' {...form.register('dob')} />
              {form.formState.errors.dob && <FieldError>{form.formState.errors.dob.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor='password'>Password</FieldLabel>
              <Input id='password' type='password' {...form.register('password')} />
              <FieldDescription>Must be at least 8 characters long.</FieldDescription>
              {form.formState.errors.password && <FieldError>{form.formState.errors.password.message}</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor='confirmPassword'>Confirm Password</FieldLabel>
              <Input id='confirmPassword' type='password' {...form.register('confirmPassword')} />
              {form.formState.errors.confirmPassword && (
                <FieldError>{form.formState.errors.confirmPassword.message}</FieldError>
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
                <Link
                  href={loginHref as Parameters<typeof Link>[0]['href']}
                  className='underline underline-offset-4 hover:text-primary'
                >
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
