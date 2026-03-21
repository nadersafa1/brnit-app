'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'

/** Shared React Query key for nutritionist assignment list invalidation. */
const dietPlanAssignmentsQueryKey = ['nutritionist', 'diet-plan-assignments'] as const

export function useCreateDietPlanAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      memberId: string
      dietPlanId: string
      startDate: string
      endDate: string
      mealTimeOverrides?: Array<{
        dietPlanMealId: string
        scheduledTime: string | null
      }>
    }) => {
      const res = await fetchWithCredentials(API_ENDPOINTS.nutritionist.dietPlanAssignments, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to create assignment')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dietPlanAssignmentsQueryKey })
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
      mealTimeOverrides,
    }: {
      id: string
      startDate?: string
      endDate?: string
      mealTimeOverrides?: Array<{
        dietPlanMealId: string
        scheduledTime: string | null
      }>
    }) => {
      const res = await fetchWithCredentials(API_ENDPOINTS.nutritionist.dietPlanAssignment(id), {
        method: 'PATCH',
        body: JSON.stringify({ startDate, endDate, mealTimeOverrides }),
      })
      return requireJsonSuccess(res, 'Failed to update assignment')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dietPlanAssignmentsQueryKey })
      toast.success('Assignment updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteDietPlanAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithCredentials(API_ENDPOINTS.nutritionist.dietPlanAssignment(id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete assignment')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dietPlanAssignmentsQueryKey })
      toast.success('Assignment deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
