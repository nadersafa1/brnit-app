import { queryOptions } from '@tanstack/react-query'
import { fetchJsonWithCredentials } from '@/lib/api/fetch-with-credentials'
import type { OrganizationContext } from '@/types/organization'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export const organizationContextKeys = {
  all: ['organization-context'] as const,
}

export function fetchOrganizationContext(): Promise<OrganizationContext> {
  return fetchJsonWithCredentials<OrganizationContext>(API_ENDPOINTS.users.organizationContext)
}

export const organizationContextQueryOptions = queryOptions({
  queryKey: organizationContextKeys.all,
  queryFn: fetchOrganizationContext,
})
