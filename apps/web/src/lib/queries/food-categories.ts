'use client'

import { queryOptions } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { adminKeys } from './keys'
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

async function fetchWithAuth(url: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export function fetchFoodCategories(filters: FoodCategoriesFilters): Promise<FoodCategoriesResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  if (filters.q != null && filters.q.trim()) params.set('q', filters.q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  const url = `${API_ENDPOINTS.admin.foodCategories}?${params.toString()}`
  return fetchWithAuth(url)
}

export function fetchFoodCategory(id: string): Promise<{ data: FoodCategory }> {
  return fetchWithAuth(API_ENDPOINTS.admin.foodCategory(id))
}

export function foodCategoriesQueryOptions(filters: FoodCategoriesFilters) {
  return queryOptions({
    queryKey: adminKeys.foodCategories(filters),
    queryFn: () => fetchFoodCategories(filters),
  })
}

export function foodCategoryQueryOptions(id: string) {
  return queryOptions({
    queryKey: adminKeys.foodCategory(id),
    queryFn: () => fetchFoodCategory(id).then((r) => r.data),
    enabled: !!id,
  })
}
