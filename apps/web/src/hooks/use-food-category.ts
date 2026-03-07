'use client'

import { useQuery } from '@tanstack/react-query'
import { foodCategoryQueryOptions } from '@/lib/queries/food-categories'
import type { DataSource } from '@/lib/queries/keys'

export function useFoodCategory(id: string, source: DataSource = 'admin') {
  const query = useQuery(foodCategoryQueryOptions(id, source))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
