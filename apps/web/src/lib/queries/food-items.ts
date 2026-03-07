'use client'

import { queryOptions } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from './keys'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

export interface FoodItem {
  id: string
  name: string
  fdcId: number | null
  categoryId: string
  categoryName: string | null
  calories: string | null
  protein: string | null
  carbs: string | null
  fat: string | null
  servingSize: string | null
  createdAt: string
  updatedAt: string
}

export interface FoodItemsFilters {
  page?: number
  perPage?: number
  q?: string
  sortBy?: 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
  categoryId?: string
}

export interface FoodItemsResponse {
  data: FoodItem[]
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

export function fetchFoodItems(
  filters: FoodItemsFilters,
  source: DataSource = 'admin'
): Promise<FoodItemsResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  if (filters.q != null && filters.q.trim()) params.set('q', filters.q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  if (filters.categoryId != null) params.set('categoryId', filters.categoryId)
  const base =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.foodItems
      : API_ENDPOINTS.admin.foodItems
  const url = `${base}?${params.toString()}`
  return fetchWithAuth(url)
}

export function fetchFoodItem(
  id: string,
  source: DataSource = 'admin'
): Promise<{ data: FoodItem }> {
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.foodItem(id)
      : API_ENDPOINTS.admin.foodItem(id)
  return fetchWithAuth(url)
}

export function foodItemsQueryOptions(
  filters: FoodItemsFilters,
  source: DataSource = 'admin'
) {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.foodItems(filters),
    queryFn: () => fetchFoodItems(filters, source),
  })
}

export function foodItemQueryOptions(id: string, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.foodItem(id),
    queryFn: () => fetchFoodItem(id, source).then((r) => r.data),
    enabled: !!id,
  })
}
