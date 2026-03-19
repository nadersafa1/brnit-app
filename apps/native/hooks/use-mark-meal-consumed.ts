import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import type { ConsumptionSlot } from '@/lib/api/consumption-slot'
import { getApiErrorMessage } from '@/lib/api/error-message'
import { markMealConsumed } from '@/lib/api/mark-meal-consumed'
import { ConsumptionDateOutOfAllowedWindowError, isWithinConsumptionDateWindow } from '@/lib/consumption-date-window'
import { memberKeys } from '@/lib/queries/keys'
import { showError, showSuccess } from '@/lib/feedback'

/** Mutation to mark a meal as consumed for a given day. Invalidates member queries on success. */
export function useMarkMealConsumed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (variables: ConsumptionSlot) => {
      if (!isWithinConsumptionDateWindow(dayjs(variables.consumedDate).toDate())) {
        throw new ConsumptionDateOutOfAllowedWindowError()
      }

      const consumedAt = dayjs(variables.consumedDate).hour(12).minute(0).second(0).toISOString()
      return markMealConsumed({
        dietPlanAssignmentId: variables.dietPlanAssignmentId,
        dietPlanMealId: variables.dietPlanMealId,
        consumedAt
      })
    },
    onSuccess: () => {
      showSuccess('Meal marked as consumed')
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
    },
    onError: (error: unknown) => {
      if (error instanceof ConsumptionDateOutOfAllowedWindowError) {
        showError('You can only mark consumption for today or the allowed backdate window.')
        return
      }
      const message = getApiErrorMessage(error, 'Could not mark meal', {
        409: 'Already marked for this day'
      })
      showError(message)
    }
  })
}
