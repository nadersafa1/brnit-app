import { queryOptions } from '@tanstack/react-query'
import type { OrganizationContext } from '@/types/organization'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export const organizationContextKeys = {
  all: ['organization-context'] as const,
}

export function fetchOrganizationContext(): Promise<OrganizationContext> {
  return fetch(API_ENDPOINTS.users.organizationContext).then(res => {
    if (!res.ok) throw new Error('Failed to fetch organization context')
    return res.json()
  })
}

export const organizationContextQueryOptions = queryOptions({
  queryKey: organizationContextKeys.all,
  queryFn: fetchOrganizationContext,
})
