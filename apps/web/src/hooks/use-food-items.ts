'use client'

import { useQuery } from '@tanstack/react-query'
import {
  foodItemsQueryOptions,
  type FoodItemsFilters,
} from '@/lib/queries/food-items'
import type { DataSource } from '@/lib/queries/keys'

export function useFoodItems(
  filters: FoodItemsFilters,
  source: DataSource = 'admin'
) {
  const query = useQuery(foodItemsQueryOptions(filters, source))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
