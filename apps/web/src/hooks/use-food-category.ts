'use client'

import { useQuery } from '@tanstack/react-query'
import { foodCategoryQueryOptions } from '@/lib/queries/food-categories'

export function useFoodCategory(id: string) {
  const query = useQuery(foodCategoryQueryOptions(id))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
