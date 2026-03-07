'use client'

import { useQuery } from '@tanstack/react-query'
import { mealQueryOptions } from '@/lib/queries/meals'
import type { DataSource } from '@/lib/queries/keys'

export function useMeal(id: string, source: DataSource = 'admin') {
  const query = useQuery(mealQueryOptions(id, source))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
