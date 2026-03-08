'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { nutritionistKeys } from '@/lib/queries/keys'

async function fetchWithAuth(
  url: string,
  options?: { method?: string; body?: string }
): Promise<Response> {
  return fetch(url, {
    credentials: 'include',
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body,
  })
}

export function useCreateDietPlanAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      memberId: string
      dietPlanId: string
      startDate: string
      endDate: string
    }) => {
      const res = await fetchWithAuth(API_ENDPOINTS.nutritionist.dietPlanAssignments, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create assignment')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutritionist', 'diet-plan-assignments'] })
      toast.success('Assignment created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateDietPlanAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      startDate,
      endDate,
    }: {
      id: string
      startDate?: string
      endDate?: string
    }) => {
      const res = await fetchWithAuth(
        API_ENDPOINTS.nutritionist.dietPlanAssignment(id),
        {
          method: 'PATCH',
          body: JSON.stringify({ startDate, endDate }),
        }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to update assignment')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutritionist', 'diet-plan-assignments'] })
      toast.success('Assignment updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDietPlanAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(API_ENDPOINTS.nutritionist.dietPlanAssignment(id), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete assignment')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nutritionist', 'diet-plan-assignments'] })
      toast.success('Assignment deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
