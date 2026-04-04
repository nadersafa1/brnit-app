'use client'

import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { getKeys, type DataSource } from '@/lib/queries/keys'
import type { CreateMeal, UpdateMeal } from '@/types/api/meal.schemas'

// --- API URLs (admin vs nutritionist) -------------------------------------

function mealResourceUrl(source: DataSource, id: string) {
  return source === 'nutritionist'
    ? API_ENDPOINTS.nutritionist.meal(id)
    : API_ENDPOINTS.admin.meal(id)
}

function mealCloneUrl(source: DataSource, id: string) {
  return source === 'nutritionist'
    ? API_ENDPOINTS.nutritionist.mealClone(id)
    : API_ENDPOINTS.admin.mealClone(id)
}

function mealsListUrl(source: DataSource) {
  return source === 'nutritionist' ? API_ENDPOINTS.nutritionist.meals : API_ENDPOINTS.admin.meals
}

/**
 * Drops cached meal list rows (all filter variants) and meal detail queries for `source`.
 * Uses the `['admin'|'nutritionist','meals']` prefix so one call replaces multiple targeted invalidates.
 */
function invalidateMealQueries(qc: QueryClient, source: DataSource) {
  const keys = getKeys(source)
  return qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
}

// --- Mutations --------------------------------------------------------------

export function useCloneMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithCredentials(mealCloneUrl(source, id), {
        method: 'POST',
        body: '{}',
      })
      const json = await requireJsonSuccess<{ data: { id: string } }>(res, 'Failed to clone meal')
      return json.data
    },
    onSuccess: () => {
      void invalidateMealQueries(qc, source)
      toast.success('Meal cloned')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCreateMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (body: CreateMeal) => {
      const res = await fetchWithCredentials(mealsListUrl(source), {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to create meal')
    },
    onSuccess: () => {
      void invalidateMealQueries(qc, source)
      toast.success('Meal created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateMeal & { id: string }) => {
      const res = await fetchWithCredentials(mealResourceUrl(source, id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to update meal')
    },
    onSuccess: () => {
      void invalidateMealQueries(qc, source)
      toast.success('Meal updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithCredentials(mealResourceUrl(source, id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete meal')
    },
    onSuccess: () => {
      void invalidateMealQueries(qc, source)
      toast.success('Meal deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
