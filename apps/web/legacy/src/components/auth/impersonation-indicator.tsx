'use client'

import { UserX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export const ImpersonationIndicator = () => {
  const router = useRouter()
  const { data: session, refetch } = authClient.useSession()
  const [isStopping, setIsStopping] = useState(false)

  if (session?.session?.impersonatedBy == null) {
    return null
  }

  const handleStopImpersonating = () => {
    setIsStopping(true)
    authClient.admin.stopImpersonating(undefined, {
      onSuccess: () => {
        refetch()
        router.push('/dashboard/admin' as Parameters<typeof router.push>[0])
        setIsStopping(false)
      },
      onError: ctx => {
        toast.error(String(ctx.error?.message ?? 'Failed to stop impersonating'))
        setIsStopping(false)
      },
    })
  }

  return (
    <div className='fixed bottom-4 left-4 z-50'>
      <Button
        size='sm'
        variant='destructive'
        onClick={handleStopImpersonating}
        disabled={isStopping}
        className='gap-1.5 shadow-lg'
      >
        <UserX className='size-4' />
        {isStopping ? 'Returning…' : 'Return to my account'}
      </Button>
    </div>
  )
}
