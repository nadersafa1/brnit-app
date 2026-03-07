'use client'

import { useQuery } from '@tanstack/react-query'
import { dietPlansQueryOptions, type DietPlansFilters } from '@/lib/queries/diet-plans'
import type { DataSource } from '@/lib/queries/keys'

export function useDietPlans(filters: DietPlansFilters, source: DataSource = 'admin') {
  const query = useQuery(dietPlansQueryOptions(filters, source))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
