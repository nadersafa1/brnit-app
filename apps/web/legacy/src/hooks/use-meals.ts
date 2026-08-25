'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { mealsQueryOptions, type MealsFilters } from '@/lib/queries/meals'
import { getKeys, type DataSource } from '@/lib/queries/keys'

export function useMeals(filters: MealsFilters, source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const query = useQuery(mealsQueryOptions(filters, source))

  /** Same prefix as meal mutations: invalidates every list variant for this source. */
  const invalidateList = useCallback(() => {
    return qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
  }, [qc, keys])

  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
    invalidateList,
  }
}
