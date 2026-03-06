'use client'

import { useQuery } from '@tanstack/react-query'
import { foodCategoriesQueryOptions, type FoodCategoriesFilters } from '@/lib/queries/food-categories'

export function useFoodCategories(filters: FoodCategoriesFilters) {
  const query = useQuery(foodCategoriesQueryOptions(filters))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
