'use client'

import { useQuery } from '@tanstack/react-query'
import { mealsQueryOptions, type MealsFilters } from '@/lib/queries/meals'

export function useMeals(filters: MealsFilters) {
  const query = useQuery(mealsQueryOptions(filters))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
