'use client'

import { queryOptions } from '@tanstack/react-query'
import { fetchJsonWithCredentials } from '@/lib/api/fetch-with-credentials'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from './keys'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

export interface FoodCategory {
  id: string
  name: string
  createdAt: string
}

export interface FoodCategoriesFilters {
  page?: number
  perPage?: number
  q?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface FoodCategoriesResponse {
  data: FoodCategory[]
  pagination: PaginationMeta
}

export function fetchFoodCategories(
  filters: FoodCategoriesFilters,
  source: DataSource = 'admin'
): Promise<FoodCategoriesResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  if (filters.q?.trim()) params.set('q', filters.q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  const base =
    source === 'nutritionist' ? API_ENDPOINTS.nutritionist.foodCategories : API_ENDPOINTS.admin.foodCategories
  const url = `${base}?${params.toString()}`
  return fetchJsonWithCredentials<FoodCategoriesResponse>(url)
}

export function fetchFoodCategory(id: string, source: DataSource = 'admin'): Promise<{ data: FoodCategory }> {
  const url =
    source === 'nutritionist' ? API_ENDPOINTS.nutritionist.foodCategory(id) : API_ENDPOINTS.admin.foodCategory(id)
  return fetchJsonWithCredentials<{ data: FoodCategory }>(url)
}

export function foodCategoriesQueryOptions(filters: FoodCategoriesFilters, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.foodCategories(filters),
    queryFn: () => fetchFoodCategories(filters, source),
  })
}

export function foodCategoryQueryOptions(id: string, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.foodCategory(id),
    queryFn: () => fetchFoodCategory(id, source).then(r => r.data),
    enabled: !!id,
  })
}
