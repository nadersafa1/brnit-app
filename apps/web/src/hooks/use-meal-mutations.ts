'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { getKeys, type DataSource } from '@/lib/queries/keys'
import type { CreateMeal, UpdateMeal } from '@/types/api/meal.schemas'

function mealResourceUrl(source: DataSource, id: string) {
  return source === 'nutritionist'
    ? API_ENDPOINTS.nutritionist.meal(id)
    : API_ENDPOINTS.admin.meal(id)
}

export function useCreateMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const listUrl =
    source === 'nutritionist' ? API_ENDPOINTS.nutritionist.meals : API_ENDPOINTS.admin.meals

  return useMutation({
    mutationFn: async (body: CreateMeal) => {
      const res = await fetchWithCredentials(listUrl, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to create meal')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
      toast.success('Meal created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateMeal & { id: string }) => {
      const res = await fetchWithCredentials(mealResourceUrl(source, id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to update meal')
    },
    onSuccess: () => {
      // Prefix `['admin'|'nutritionist', 'meals']` matches both list queries (`…, filters`) and
      // detail (`…, mealId`). A second invalidate on `keys.meal(id)` duplicated work and could
      // refetch the same detail query twice per mutation.
      qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
      toast.success('Meal updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithCredentials(mealResourceUrl(source, id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete meal')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
      toast.success('Meal deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
