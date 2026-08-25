import { SignupForm } from '@/components/signup-form'

export default async function Page({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ invitationId?: string | string[]; callbackUrl?: string | string[] }>
}>) {
  const params = await searchParams
  const rawInvitationId = params.invitationId
  const rawCallbackUrl = params.callbackUrl
  const invitationId = typeof rawInvitationId === 'string' ? rawInvitationId : rawInvitationId?.[0]
  const callbackUrl = typeof rawCallbackUrl === 'string' ? rawCallbackUrl : rawCallbackUrl?.[0]

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm invitationId={invitationId} callbackUrl={callbackUrl} />
      </div>
    </div>
  )
}
