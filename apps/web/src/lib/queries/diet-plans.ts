'use client'

import { queryOptions } from '@tanstack/react-query'
import { fetchJsonWithCredentials } from '@/lib/api/fetch-with-credentials'
import { getKeys, type DataSource } from './keys'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

export interface DietPlanMealItemSummary {
  foodName: string
  quantity: number
}

export interface DietPlanMeal {
  id: string
  mealId: string
  mealName: string
  dayNumber: number
  mealType: string
  mealOrder: number
  mealItems?: DietPlanMealItemSummary[]
}

export interface DietPlan {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  slotCount?: number
  dietPlanMeals?: DietPlanMeal[]
}

export interface DietPlansFilters {
  page?: number
  perPage?: number
  q?: string
  sortBy?: 'name' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface DietPlansResponse {
  data: DietPlan[]
  pagination: PaginationMeta
}

export function fetchDietPlans(
  filters: DietPlansFilters,
  source: DataSource = 'admin'
): Promise<DietPlansResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  const q = filters.q?.trim()
  if (q) params.set('q', q)
  if (filters.sortBy != null) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder != null) params.set('sortOrder', filters.sortOrder)
  const base =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlans
      : API_ENDPOINTS.admin.dietPlans
  const url = `${base}?${params.toString()}`
  return fetchJsonWithCredentials<DietPlansResponse>(url)
}

export function fetchDietPlan(
  id: string,
  source: DataSource = 'admin'
): Promise<{ data: DietPlan }> {
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlan(id)
      : API_ENDPOINTS.admin.dietPlan(id)
  return fetchJsonWithCredentials<{ data: DietPlan }>(url)
}

export function dietPlansQueryOptions(
  filters: DietPlansFilters,
  source: DataSource = 'admin'
) {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.dietPlans(filters),
    queryFn: () => fetchDietPlans(filters, source),
  })
}

export function dietPlanQueryOptions(id: string, source: DataSource = 'admin') {
  const keys = getKeys(source)
  return queryOptions({
    queryKey: keys.dietPlan(id),
    queryFn: () => fetchDietPlan(id, source).then((r) => r.data),
    enabled: !!id,
  })
}
