import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useCallback, useRef, useState } from 'react'

import {
  AppBottomSheet,
  SheetFooter,
  type AppBottomSheetRef,
} from '@/components/bottom-sheet'
import { useMealItemAlternatives } from '@/hooks/use-meal-item-alternatives'
import { useMealItemDetailOverrideActions } from '@/hooks/use-meal-item-detail-override-actions'
import { useMealItemDetailSheetVisibility } from '@/hooks/use-meal-item-detail-sheet-visibility'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'

import { MealItemDetailActions } from './meal-item-detail-actions'
import { MealItemDetailContent } from './meal-item-detail-content'
import type { MealItemDetailSheetProps } from './types'

export function MealItemDetailSheet({ payload, onClose }: Readonly<MealItemDetailSheetProps>) {
  const ref = useRef<AppBottomSheetRef>(null)
  const [selectedAlternative, setSelectedAlternative] = useState<FoodItemAlternative | null>(null)

  const resetSelection = useCallback(() => {
    setSelectedAlternative(null)
  }, [])

  useMealItemDetailSheetVisibility(payload, ref, resetSelection)

  const closeSheet = useCallback(() => {
    setSelectedAlternative(null)
    onClose()
  }, [onClose])

  const {
    submitOverride,
    restoreOriginalForDay,
    resetOverrideSubmissionState,
    isSubmittingDay,
    isSubmittingPlan,
    isRestoringForDay,
  } = useMealItemDetailOverrideActions(payload, selectedAlternative, closeSheet)

  const handleClose = useCallback(() => {
    resetOverrideSubmissionState()
    closeSheet()
  }, [closeSheet, resetOverrideSubmissionState])

  const alternativesQuery = useMealItemAlternatives({
    assignmentId: payload?.dietPlanAssignmentId ?? '',
    dietPlanMealId: payload?.dietPlanMealId ?? '',
    mealItemId: payload?.item.mealItemId ?? '',
    date: payload?.consumedDate,
    enabled: payload != null,
  })

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <SheetFooter {...props}>
        <MealItemDetailActions
          itemIsOverridden={payload?.item.isOverridden ?? false}
          selectedAlternative={selectedAlternative}
          isSubmittingDay={isSubmittingDay}
          isSubmittingPlan={isSubmittingPlan}
          isRestoringForDay={isRestoringForDay}
          onReplaceDay={() => submitOverride('day')}
          onReplacePlan={() => submitOverride('plan')}
          onRestoreOriginalForDay={restoreOriginalForDay}
        />
      </SheetFooter>
    ),
    [
      isRestoringForDay,
      isSubmittingDay,
      isSubmittingPlan,
      payload?.item.isOverridden,
      restoreOriginalForDay,
      selectedAlternative,
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
