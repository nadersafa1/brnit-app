import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { deleteMealConsumption } from '@/lib/api/delete-meal-consumption'
import type { ConsumptionSlot } from '@/lib/api/consumption-slot'
import { getApiErrorMessage } from '@/lib/api/error-message'
import { ApiError } from '@/lib/api'
import { ConsumptionDateOutOfAllowedWindowError, isWithinConsumptionDateWindow } from '@/lib/consumption-date-window'
import { memberKeys } from '@/lib/queries/keys'
import { showError, showSuccess } from '@/lib/feedback'

/** Mutation to unmark a meal (delete consumption). Invalidates member queries on success or 404. */
export function useUnmarkMealConsumed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (variables: ConsumptionSlot) => {
      if (!isWithinConsumptionDateWindow(dayjs(variables.consumedDate).toDate())) {
        throw new ConsumptionDateOutOfAllowedWindowError()
      }

      return deleteMealConsumption({
        dietPlanAssignmentId: variables.dietPlanAssignmentId,
        dietPlanMealId: variables.dietPlanMealId,
        consumedDate: variables.consumedDate
      })
    },
    onSuccess: () => {
      showSuccess('Meal unmarked')
      queryClient.invalidateQueries({ queryKey: memberKeys.all })
    },
    onError: (error: unknown) => {
      if (error instanceof ConsumptionDateOutOfAllowedWindowError) {
        showError('You can only unmark consumption for today or the allowed backdate window.')
        return
      }
      const message = getApiErrorMessage(error, 'Could not unmark meal', {
        404: 'Consumption not found'
      })
      showError(message)
      if (error instanceof ApiError && error.status === 404) {
        queryClient.invalidateQueries({ queryKey: memberKeys.all })
      }
    }
  })
}
