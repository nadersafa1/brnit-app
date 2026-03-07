'use client'

import { useQuery } from '@tanstack/react-query'
import { mealQueryOptions } from '@/lib/queries/meals'

export function useMeal(id: string) {
  const query = useQuery(mealQueryOptions(id))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
