import { auth } from '@burn-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { CompleteProfileForm } from '@/components/complete-profile-form'

export default async function CompleteProfilePage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ callbackUrl?: string | string[] }> }>) {
  const params = await searchParams
  const callbackUrl = typeof params.callbackUrl === 'string' ? params.callbackUrl : '/dashboard'
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }
  if (session.user.dob) {
    // Typed routes expect RouteImpl; callbackUrl is a valid app path string
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion -- see above
    redirect(callbackUrl as Parameters<typeof redirect>[0])
  }

  return (
    <div className='flex min-h-svh w-full items-center justify-center p-6 md:p-10'>
      <div className='w-full max-w-sm'>
        <CompleteProfileForm callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
