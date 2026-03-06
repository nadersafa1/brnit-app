'use client'

import { useQuery } from '@tanstack/react-query'
import { foodItemQueryOptions } from '@/lib/queries/food-items'

export function useFoodItem(id: string) {
  const query = useQuery(foodItemQueryOptions(id))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
