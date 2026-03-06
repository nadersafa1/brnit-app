'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Flame, LayoutDashboard, UserCog } from 'lucide-react'

import { NavMain } from '@/components/nav-main'
import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'

const baseNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
    isActive: true,
    items: [],
  },
  {
    title: 'Organizations',
    url: '/dashboard/organizations',
    icon: Flame,
    items: [],
  },
]

const adminNavItem = {
  title: 'Admin',
  url: '/dashboard/admin',
  icon: UserCog,
  isActive: true,
  items: [
    { title: 'Users', url: '/dashboard/admin' },
    { title: 'Categories', url: '/dashboard/admin/categories' },
    { title: 'Food Items', url: '/dashboard/admin/food-items' },
  ],
}

export const AppSidebar = (props: React.ComponentProps<typeof Sidebar>) => {
  const { data: session } = authClient.useSession()
  const navMain = useMemo(
    () =>
      session?.user?.role === 'admin'
        ? [...baseNavItems, adminNavItem]
        : baseNavItems,
    [session?.user?.role],
  )

  return (
    <Sidebar variant='inset' {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link href='/dashboard'>
                <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
                  <Flame className='size-4' />
                </div>
                <div className='grid flex-1 text-left text-sm leading-tight'>
                  <span className='truncate font-medium'>Brnit</span>
                  <span className='truncate text-xs'>Health challenges</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
