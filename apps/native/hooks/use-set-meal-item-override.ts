import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, API_ENDPOINTS } from '@/lib/api'
import { memberKeys } from '@/lib/queries/keys'

type SetMealItemOverrideBody = {
  foodItemId: string
  quantity: number
  date?: string
}

type SetMealItemOverrideParams = {
  assignmentId: string
  dietPlanMealId: string
  mealItemId: string
  body: SetMealItemOverrideBody
}

type SetMealItemOverrideResponse = { data: object }

export function useSetMealItemOverride() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      assignmentId,
      dietPlanMealId,
      mealItemId,
      body,
    }: SetMealItemOverrideParams) => {
      const path = API_ENDPOINTS.member.mealItemOverride(
        assignmentId,
        dietPlanMealId,
        mealItemId
      )
      return apiFetch<SetMealItemOverrideResponse>(path, {
        method: 'PUT',
        body: {
          foodItemId: body.foodItemId,
          quantity: body.quantity,
          ...(typeof body.date === 'string' ? { date: body.date } : {}),
        },
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: memberKeys.all })
    },
  })
}
