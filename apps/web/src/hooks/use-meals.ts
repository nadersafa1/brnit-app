'use client'

import { useQuery } from '@tanstack/react-query'
import { mealsQueryOptions, type MealsFilters } from '@/lib/queries/meals'
import type { DataSource } from '@/lib/queries/keys'

export function useMeals(filters: MealsFilters, source: DataSource = 'admin') {
  const query = useQuery(mealsQueryOptions(filters, source))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
