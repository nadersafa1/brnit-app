import { auth } from '@burn-app/auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import DashboardLayoutClient from './dashboard-layout-client'

export default async function DashboardRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    redirect('/login')
  }
  if (!session.user.dob) {
    redirect('/complete-profile')
  }

  return <DashboardLayoutClient>{children}</DashboardLayoutClient>
}
