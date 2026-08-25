'use client'

import { useQuery } from '@tanstack/react-query'
import {
  foodCategoriesQueryOptions,
  type FoodCategoriesFilters,
} from '@/lib/queries/food-categories'
import type { DataSource } from '@/lib/queries/keys'

export function useFoodCategories(
  filters: FoodCategoriesFilters,
  source: DataSource = 'admin'
) {
  const query = useQuery(foodCategoriesQueryOptions(filters, source))
  return {
    data: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
