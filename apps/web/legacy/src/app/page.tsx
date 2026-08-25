import Link from 'next/link'

import { auth } from '@brnit/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (session?.user) {
    if (!session.user.dob) {
      redirect('/complete-profile')
    }
    redirect('/dashboard')
  }

  return (
    <div className='flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6 md:p-10'>
      <div className='flex w-full max-w-md flex-col items-center gap-6 text-center'>
        <h1 className='text-3xl font-bold tracking-tight'>Brnit</h1>
        <p className='text-muted-foreground'>
          Challenge yourself with your group. Diet and exercise tailored for a healthier life.
        </p>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>Sign in or create an account to join your organization.</CardDescription>
          </CardHeader>
          <CardContent className='flex flex-col gap-2'>
            <Link
              href='/login'
              className={cn(
                'inline-flex h-8 items-center justify-center border border-transparent bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80 rounded-md',
                'w-full'
              )}
            >
              Log in
            </Link>
            <Link
              href='/signup'
              className={cn(
                'inline-flex h-8 items-center justify-center border border-border bg-background px-2.5 text-xs font-medium hover:bg-muted rounded-md',
                'w-full'
              )}
            >
              Sign up
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
