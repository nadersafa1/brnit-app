'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { getKeys, type DataSource } from '@/lib/queries/keys'
import type { CreateDietPlan, UpdateDietPlan } from '@/types/api/diet-plan.schemas'

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

export function useCreateDietPlan(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const url =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlans
      : API_ENDPOINTS.admin.dietPlans
  return useMutation({
    mutationFn: async (body: CreateDietPlan) => {
      const res = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create diet plan')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dietPlans({}).slice(0, 2) })
      toast.success('Diet plan created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateDietPlan(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const getUrl = (id: string) =>
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlan(id)
      : API_ENDPOINTS.admin.dietPlan(id)
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateDietPlan & { id: string }) => {
      const res = await fetchWithAuth(getUrl(id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? err?.details ?? 'Failed to update diet plan')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: keys.dietPlan(variables.id) })
      qc.invalidateQueries({ queryKey: keys.dietPlans({}).slice(0, 2) })
      toast.success('Diet plan updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDietPlan(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const getUrl = (id: string) =>
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlan(id)
      : API_ENDPOINTS.admin.dietPlan(id)
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(getUrl(id), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete diet plan')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dietPlans({}).slice(0, 2) })
      toast.success('Diet plan deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
