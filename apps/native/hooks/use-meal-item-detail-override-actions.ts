import { useCallback, useState } from 'react'

import { buildSetMealItemOverrideParams } from '@/components/meal-item-detail-sheet/build-override-params'
import type {
  MealItemDetailPayload,
  OverrideScope,
} from '@/components/meal-item-detail-sheet/types'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'

import { useSetMealItemOverride } from './use-set-meal-item-override'
import { useUndoMealAlternativesForDay } from './use-undo-meal-alternatives-for-day'

/**
 * Mutations for the meal-item bottom sheet: replace with an alternative (day vs plan)
 * or restore the plan item for a single day.
 */
export function useMealItemDetailOverrideActions(
  payload: MealItemDetailPayload | null,
  selectedAlternative: FoodItemAlternative | null,
  onSuccess: () => void
) {
  const [submittingScope, setSubmittingScope] = useState<OverrideScope | null>(
    null
  )
  const setOverrideMutation = useSetMealItemOverride()
  const undoDayMutation = useUndoMealAlternativesForDay()

  const resetOverrideSubmissionState = useCallback(() => {
    setSubmittingScope(null)
  }, [])

  const submitOverride = useCallback(
    (scope: OverrideScope) => {
      if (!payload || !selectedAlternative) return
      setSubmittingScope(scope)
      setOverrideMutation.mutate(
        buildSetMealItemOverrideParams(payload, selectedAlternative, scope),
        {
          onSuccess,
          onSettled: () => setSubmittingScope(null),
        }
      )
    },
    [payload, selectedAlternative, setOverrideMutation, onSuccess]
  )

  const restoreOriginalForDay = useCallback(() => {
    if (!payload) return
    undoDayMutation.mutate(
      {
        assignmentId: payload.dietPlanAssignmentId,
        date: payload.consumedDate,
        slots: [
          {
            dietPlanMealId: payload.dietPlanMealId,
            mealItemId: payload.item.mealItemId,
          },
        ],
      },
      { onSuccess }
    )
  }, [payload, onSuccess, undoDayMutation.mutate])

  return {
    submitOverride,
    restoreOriginalForDay,
    resetOverrideSubmissionState,
    isSubmittingDay:
      setOverrideMutation.isPending && submittingScope === 'day',
    isSubmittingPlan:
      setOverrideMutation.isPending && submittingScope === 'plan',
    isRestoringForDay: undoDayMutation.isPending,
  }
}
