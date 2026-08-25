'use client'

import { useQuery } from '@tanstack/react-query'
import { organizationContextQueryOptions } from '@/lib/queries/organization-context'
import { DEFAULT_ORGANIZATION_CONTEXT } from '@/types/organization'

export function useOrganizationContext() {
  const { data, isLoading, error, refetch } = useQuery(
    organizationContextQueryOptions
  )

  return {
    context: data ?? DEFAULT_ORGANIZATION_CONTEXT,
    isLoading,
    error: error ?? null,
    refetch,
  }
}
