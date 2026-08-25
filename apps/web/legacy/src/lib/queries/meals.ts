'use client'

import { queryOptions } from '@tanstack/react-query'
import { fetchJsonWithCredentials } from '@/lib/api/fetch-with-credentials'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from './keys'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

export interface MealItem {
  id: string
  foodItemId: string
  foodName: string
  categories: { id: string; name: string }[]
  quantity: number
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: '100g' | 'piece' | 'liters' | 'cup' | 'tbsp'
  gramsPerUnit: number | null
}

export interface Meal {
  id: string
  name: string
  description: string | null
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
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
  return fetchJsonWithCredentials<MealsResponse>(url)
}

export function fetchMeal(id: string, source: DataSource = 'admin'): Promise<{ data: Meal }> {
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meal(id)
      : API_ENDPOINTS.admin.meal(id)
  return fetchJsonWithCredentials<{ data: Meal }>(url)
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
    // Avoid an extra GET when a modal closes and the window regains focus right after invalidate.
    refetchOnWindowFocus: false,
  })
}
