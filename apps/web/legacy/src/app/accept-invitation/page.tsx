'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { authClient } from '@/lib/auth-client'
import { organizationContextKeys } from '@/lib/queries/organization-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loader from '@/components/loader'

const AcceptInvitationContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invitationId = searchParams.get('invitationId')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const { data: session, isPending: sessionPending } = authClient.useSession()

  useEffect(() => {
    if (sessionPending || !invitationId) return
    if (!session?.user) {
      router.replace(
        `/login?callbackUrl=${encodeURIComponent('/accept-invitation')}&invitationId=${encodeURIComponent(invitationId)}`
      )
      return
    }
    if (status !== 'idle') return

    setStatus('loading')
    authClient.organization
      .acceptInvitation({ invitationId })
      .then(async res => {
        if (res.error) {
          toast.error(res.error.message ?? 'Failed to accept invitation')
          setStatus('error')
          return
        }
        const data = res.data as { organizationId?: string; organization?: { id: string } } | undefined
        const organizationId = data?.organizationId ?? data?.organization?.id
        if (organizationId) {
          const setActive = (
            authClient.organization as { setActiveOrganization?: (p: { organizationId: string }) => Promise<unknown> }
          ).setActiveOrganization
          if (setActive) await setActive({ organizationId })
        }
        await queryClient.invalidateQueries({ queryKey: organizationContextKeys.all })
        toast.success('You joined the organization')
        setStatus('done')
        router.replace('/dashboard')
      })
      .catch(() => {
        toast.error('Failed to accept invitation')
        setStatus('error')
      })
  }, [session, sessionPending, invitationId, router, status, queryClient])

  if (!invitationId) {
    return (
      <div className='flex min-h-screen items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Invalid link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm'>
              No invitation ID provided. Use the link from your invitation email.
            </p>
            <Button className='mt-4' onClick={() => router.push('/dashboard')}>
              Go to dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (sessionPending || status === 'loading') {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <Loader />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className='flex min-h-screen items-center justify-center p-4'>
        <Card className='w-full max-w-md'>
          <CardHeader>
            <CardTitle>Could not accept</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen items-center justify-center'>
      <Loader />
    </div>
  )
}

const AcceptInvitationPage = () => (
  <Suspense
    fallback={
      <div className='flex min-h-screen items-center justify-center'>
        <Loader />
      </div>
    }
  >
    <AcceptInvitationContent />
  </Suspense>
)

export default AcceptInvitationPage
