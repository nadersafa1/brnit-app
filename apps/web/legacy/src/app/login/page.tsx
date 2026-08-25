import { LoginForm } from '@/components/login-form'

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ callbackUrl?: string | string[]; invitationId?: string | string[] }>
}>) {
  const params = await searchParams
  const rawCallback = params.callbackUrl
  const rawInvitationId = params.invitationId
  const callbackUrl = typeof rawCallback === 'string' ? rawCallback : rawCallback?.[0]
  const invitationId = typeof rawInvitationId === 'string' ? rawInvitationId : rawInvitationId?.[0]

  const redirectUrl =
    invitationId && (!callbackUrl || callbackUrl.startsWith('/accept-invitation'))
      ? `/accept-invitation?invitationId=${encodeURIComponent(invitationId)}`
      : callbackUrl

  return (
    <div className='bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10'>
      <div className='w-full max-w-sm'>
        <LoginForm callbackUrl={redirectUrl} invitationId={invitationId ?? undefined} />
      </div>
    </div>
  )
}
