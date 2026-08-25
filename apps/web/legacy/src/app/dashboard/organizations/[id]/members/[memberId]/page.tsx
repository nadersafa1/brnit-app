import { auth } from '@brnit/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import MemberDetailContent from './member-detail-content'

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string; memberId: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const { id: organizationId, memberId } = await params

  return (
    <MemberDetailContent
      organizationId={organizationId}
      memberId={memberId}
    />
  )
}
