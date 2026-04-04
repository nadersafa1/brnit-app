'use client'

import { useState } from 'react'
import { useFoodItems } from '@/hooks/use-food-items'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodItemsFilters } from '@/lib/queries/food-items'
import type { DataSource } from '@/lib/queries/keys'

/** Table state for food items scoped to one category (list + search + sort + page). */
export type FoodItemsInCategoryFilters = Omit<FoodItemsFilters, 'categoryId'>

const initialFilters: FoodItemsInCategoryFilters = {
  page: 1,
  perPage: DEFAULT_PAGE_SIZE,
  q: '',
  sortBy: 'name',
  sortOrder: 'asc',
}

/**
 * Food items list filtered by `categoryId`, for category detail pages.
 * Keeps filter state local; merges `categoryId` into the items query.
 */
export function useFoodItemsForCategory(categoryId: string, source: DataSource = 'admin') {
  const [filters, setFilters] = useState<FoodItemsInCategoryFilters>(initialFilters)

  const { data, pagination, isLoading, error, refetch } = useFoodItems(
    { ...filters, categoryId },
    source
  )

  const paginationFallback = {
    page: filters.page ?? 1,
    perPage: filters.perPage ?? DEFAULT_PAGE_SIZE,
  }

  return {
    filters,
    items: data,
    isLoading,
    error,
    refetch,
    paginationMeta: pagination,
    paginationFallback,
    onPageChange: (page: number) => setFilters(f => ({ ...f, page })),
    onPageSizeChange: (perPage: number) => setFilters(f => ({ ...f, perPage, page: 1 })),
    onSearchChange: (q: string) => setFilters(f => ({ ...f, q, page: 1 })),
    onSortingChange: (sortBy?: FoodItemsInCategoryFilters['sortBy'], sortOrder?: FoodItemsInCategoryFilters['sortOrder']) =>
      setFilters(f => ({
        ...f,
        sortBy: sortBy ?? 'name',
        sortOrder: sortOrder ?? 'asc',
        page: 1,
      })),
  }
}
