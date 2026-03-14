import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, API_ENDPOINTS } from '@/lib/api'
import { memberKeys } from '@/lib/queries/keys'

type LogMealConsumptionBody = {
  dietPlanAssignmentId: string
  dietPlanMealId: string
  consumedAt: string
  usePlannedItems?: boolean
}

type LogMealConsumptionResponse = { data: { id: string } }

export function useLogMealConsumption() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: LogMealConsumptionBody) => {
      return apiFetch<LogMealConsumptionResponse>(
        API_ENDPOINTS.member.dietPlanMealConsumptions,
        {
          method: 'POST',
          body: { ...body, usePlannedItems: body.usePlannedItems ?? true },
        }
      )
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all })
      void queryClient.invalidateQueries({
        queryKey: memberKeys.dietPlanMealConsumptions(undefined),
      })
    },
  })
}
