'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Activity, Flame, LayoutDashboard, UserCog, UtensilsCrossed } from 'lucide-react'

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
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessDirectAdminFeatures } from '@/lib/authorization/direct-admin-access'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'
import type { LucideIcon } from 'lucide-react'

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: { title: string; url: string }[]
}

const baseNavItems: NavItem[] = [
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

const adminNavItem: NavItem = {
  title: 'Admin',
  url: '/dashboard/admin',
  icon: UserCog,
  isActive: true,
  items: [
    { title: 'Users', url: '/dashboard/admin' },
    { title: 'Categories', url: '/dashboard/admin/categories' },
    { title: 'Food Items', url: '/dashboard/admin/food-items' },
    { title: 'Meals', url: '/dashboard/admin/meals' },
    { title: 'Diet Plans', url: '/dashboard/admin/diet-plans' },
  ],
}

const directAdminNavItem: NavItem = {
  title: 'Direct Admin',
  url: '/dashboard/direct-admin/members',
  icon: Activity,
  isActive: true,
  items: [{ title: 'Members', url: '/dashboard/direct-admin/members' }],
}

const nutritionistNavItem: NavItem = {
  title: 'Nutritionist',
  url: '/dashboard/nutritionist/categories',
  icon: UtensilsCrossed,
  isActive: true,
  items: [
    { title: 'Categories', url: '/dashboard/nutritionist/categories' },
    { title: 'Food Items', url: '/dashboard/nutritionist/food-items' },
    { title: 'Meals', url: '/dashboard/nutritionist/meals' },
    { title: 'Diet Plans', url: '/dashboard/nutritionist/diet-plans' },
  ],
}

export const AppSidebar = (props: React.ComponentProps<typeof Sidebar>) => {
  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()

  const navMain = useMemo(() => {
    const items: NavItem[] = [...baseNavItems]
    if (session?.user?.role === 'admin') {
      items.push(adminNavItem)
    }
    if (canAccessDirectAdminFeatures(session ?? null, context)) {
      items.push({ ...directAdminNavItem, isActive: session?.user?.role === 'direct-admin' ? true : false })
    }
    if (canAccessNutritionistFeatures(session ?? null, context)) {
      items.push({ ...nutritionistNavItem, isActive: session?.user?.role === 'nutritionist' ? true : false })
    }
    return items
  }, [session, context])

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
