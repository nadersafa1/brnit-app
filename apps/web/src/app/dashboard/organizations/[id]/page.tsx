import { auth } from '@brnit/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import OrganizationsDetailContent from './organizations-detail-content'

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  const { id } = await params

  return <OrganizationsDetailContent organizationId={id} />
}
