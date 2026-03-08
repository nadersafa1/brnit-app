import { auth } from '@burn-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import OrganizationsTable from './components/organizations-table'

export default async function OrganizationsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Organizations</h2>
      <OrganizationsTable />
    </div>
  )
}
