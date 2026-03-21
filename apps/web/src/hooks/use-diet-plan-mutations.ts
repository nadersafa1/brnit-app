'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { getKeys, type DataSource } from '@/lib/queries/keys'
import type { CreateDietPlan, UpdateDietPlan } from '@/types/api/diet-plan.schemas'

/** Matches POST diet-plans route: `NextResponse.json({ data: newPlan }, { status: 201 })`. */
type CreateDietPlanApiResponse = { data: { id: string } }

function dietPlanResourceUrl(source: DataSource, id: string) {
  return source === 'nutritionist'
    ? API_ENDPOINTS.nutritionist.dietPlan(id)
    : API_ENDPOINTS.admin.dietPlan(id)
}

export function useCreateDietPlan(source: DataSource = 'admin') {
  const qc = useQueryClient()
  const keys = getKeys(source)
  const listUrl =
    source === 'nutritionist'
      ? API_ENDPOINTS.nutritionist.dietPlans
      : API_ENDPOINTS.admin.dietPlans

  return useMutation({
    mutationFn: async (body: CreateDietPlan) => {
      const res = await fetchWithCredentials(listUrl, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess<CreateDietPlanApiResponse>(res, 'Failed to create diet plan')
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

  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateDietPlan & { id: string }) => {
      const res = await fetchWithCredentials(dietPlanResourceUrl(source, id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to update diet plan')
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

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithCredentials(dietPlanResourceUrl(source, id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete diet plan')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.dietPlans({}).slice(0, 2) })
      toast.success('Diet plan deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
