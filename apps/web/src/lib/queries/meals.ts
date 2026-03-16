'use client'

import { queryOptions } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from './keys'
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
  unit: '100g' | 'piece'
  gramsPerUnit: number | null
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

export function fetchMeals(
  filters: MealsFilters,
  source: DataSource = 'admin'
): Promise<MealsResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  const q = filters.q?.trim()
  if (q) params.set('q', q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  const base =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meals
      : API_ENDPOINTS.admin.meals
  const url = `${base}?${params.toString()}`
  return fetchWithAuth(url)
}

export function fetchMeal(id: string, source: DataSource = 'admin'): Promise<{ data: Meal }> {
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meal(id)
      : API_ENDPOINTS.admin.meal(id)
  return fetchWithAuth(url)
}

export function mealsQueryOptions(filters: MealsFilters, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.meals(filters),
    queryFn: () => fetchMeals(filters, source),
  })
}

export function mealQueryOptions(id: string, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.meal(id),
    queryFn: () => fetchMeal(id, source).then((r) => r.data),
    enabled: !!id,
  })
}
