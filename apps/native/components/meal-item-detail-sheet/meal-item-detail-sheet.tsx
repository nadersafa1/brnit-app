import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'

import {
  AppBottomSheet,
  SheetFooter,
  type AppBottomSheetRef,
} from '@/components/bottom-sheet'
import { useMealItemAlternatives } from '@/hooks/use-meal-item-alternatives'
import { useMealItemDetailSheetVisibility } from '@/hooks/use-meal-item-detail-sheet-visibility'
import { useSetMealItemOverride } from '@/hooks/use-set-meal-item-override'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'

import { buildSetMealItemOverrideParams } from './build-override-params'
import { MealItemDetailActions } from './meal-item-detail-actions'
import { MealItemDetailContent } from './meal-item-detail-content'
import type { MealItemDetailSheetProps, OverrideScope } from './types'

export function MealItemDetailSheet({ payload, onClose }: Readonly<MealItemDetailSheetProps>) {
  const ref = useRef<AppBottomSheetRef>(null)
  const [selectedAlternative, setSelectedAlternative] = useState<FoodItemAlternative | null>(null)
  const [submittingScope, setSubmittingScope] = useState<OverrideScope | null>(null)
  const setMealItemOverrideMutation = useSetMealItemOverride()

  const resetSelection = useCallback(() => {
    setSelectedAlternative(null)
  }, [])

  useMealItemDetailSheetVisibility(payload, ref, resetSelection)

  const alternativesQuery = useMealItemAlternatives({
    assignmentId: payload?.dietPlanAssignmentId ?? '',
    dietPlanMealId: payload?.dietPlanMealId ?? '',
    mealItemId: payload?.item.mealItemId ?? '',
    date: payload?.consumedDate,
    enabled: payload != null,
  })

  const handleClose = useCallback(() => {
    setSelectedAlternative(null)
    setSubmittingScope(null)
    onClose()
  }, [onClose])

  const submitOverride = useCallback(
    (scope: OverrideScope) => {
      if (!payload || !selectedAlternative) return
      setSubmittingScope(scope)
      setMealItemOverrideMutation.mutate(buildSetMealItemOverrideParams(payload, selectedAlternative, scope), {
        onSuccess: handleClose,
        onSettled: () => setSubmittingScope(null),
      })
    },
    [handleClose, payload, selectedAlternative, setMealItemOverrideMutation]
  )

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <SheetFooter {...props}>
        <MealItemDetailActions
          selectedAlternative={selectedAlternative}
          isSubmittingDay={setMealItemOverrideMutation.isPending && submittingScope === 'day'}
          isSubmittingPlan={setMealItemOverrideMutation.isPending && submittingScope === 'plan'}
          onReplaceDay={() => submitOverride('day')}
          onReplacePlan={() => submitOverride('plan')}
        />
      </SheetFooter>
    ),
    [
      selectedAlternative,
      setMealItemOverrideMutation.isPending,
      submittingScope,
      submitOverride,
    ]
  )

  return (
    <AppBottomSheet ref={ref} onClose={handleClose} headerTitle="Meal item" footerComponent={renderFooter}>
      {payload ? (
        <MealItemDetailContent
          item={payload.item}
          alternatives={alternativesQuery.data?.data ?? []}
          isLoading={alternativesQuery.isPending}
          isError={alternativesQuery.isError}
          selectedAlternative={selectedAlternative}
          onSelectAlternative={setSelectedAlternative}
        />
      ) : null}
    </AppBottomSheet>
  )
}
