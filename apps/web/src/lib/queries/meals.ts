'use client'

import { queryOptions } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { adminKeys } from './keys'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

export interface MealItem {
  id: string
  foodItemId: string
  foodName: string
  categoryName: string | null
  quantity: number
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export interface Meal {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  mealItems?: MealItem[]
}

export interface MealsFilters {
  page?: number
  perPage?: number
  q?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface MealsResponse {
  data: Meal[]
  pagination: PaginationMeta
}

async function fetchWithAuth(url: string, options?: { method?: string; body?: string }) {
  const res = await fetch(url, {
    credentials: 'include',
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export function fetchMeals(filters: MealsFilters): Promise<MealsResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  const q = filters.q?.trim()
  if (q) params.set('q', q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  const url = `${API_ENDPOINTS.admin.meals}?${params.toString()}`
  return fetchWithAuth(url)
}

export function fetchMeal(id: string): Promise<{ data: Meal }> {
  return fetchWithAuth(API_ENDPOINTS.admin.meal(id))
}

export function mealsQueryOptions(filters: MealsFilters) {
  return queryOptions({
    queryKey: adminKeys.meals(filters),
    queryFn: () => fetchMeals(filters),
  })
}

export function mealQueryOptions(id: string) {
  return queryOptions({
    queryKey: adminKeys.meal(id),
    queryFn: () => fetchMeal(id).then((r) => r.data),
    enabled: !!id,
  })
}
