'use client'

import { useQuery } from '@tanstack/react-query'
import { foodItemsQueryOptions, type FoodItemsFilters } from '@/lib/queries/food-items'

export function useFoodItems(filters: FoodItemsFilters) {
  const query = useQuery(foodItemsQueryOptions(filters))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
