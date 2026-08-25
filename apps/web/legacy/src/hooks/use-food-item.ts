'use client'

import { useQuery } from '@tanstack/react-query'
import { foodItemQueryOptions } from '@/lib/queries/food-items'
import type { DataSource } from '@/lib/queries/keys'

export function useFoodItem(id: string, source: DataSource = 'admin') {
  const query = useQuery(foodItemQueryOptions(id, source))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
