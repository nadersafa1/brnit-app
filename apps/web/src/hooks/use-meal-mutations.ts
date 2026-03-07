'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from '@/lib/queries/keys'
import type { CreateMeal, UpdateMeal } from '@/types/api/meal.schemas'

async function fetchWithAuth(
  url: string,
  options?: { method?: string; body?: string }
): Promise<Response> {
  const res = await fetch(url, {
    credentials: 'include',
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body,
  })
  return res
}

export function useCreateMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meals
      : API_ENDPOINTS.admin.meals
  return useMutation({
    mutationFn: async (body: CreateMeal) => {
      const res = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create meal')
      }
      return res.json()
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
  const getUrl = (id: string) =>
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meal(id)
      : API_ENDPOINTS.admin.meal(id)
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateMeal & { id: string }) => {
      const res = await fetchWithAuth(getUrl(id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to update meal')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: keys.meal(variables.id) })
      qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
      toast.success('Meal updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteMeal(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const getUrl = (id: string) =>
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.meal(id)
      : API_ENDPOINTS.admin.meal(id)
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(getUrl(id), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete meal')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.meals({}).slice(0, 2) })
      toast.success('Meal deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
