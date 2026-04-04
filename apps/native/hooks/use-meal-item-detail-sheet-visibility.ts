import { type RefObject, useEffect } from 'react'

import type { AppBottomSheetRef } from '@/components/bottom-sheet'
import type { MealItemDetailPayload } from '@/components/meal-item-detail-sheet/types'

/**
 * Keeps the bottom sheet in sync with parent-controlled `payload`.
 * - When payload is set: opens after layout (requestAnimationFrame) and clears selection.
 * - When cleared: dismisses the sheet and clears selection.
 *
 * useEffect is required here: gorhom bottom sheet is imperative (open/close on ref), not declarative.
 */
export function useMealItemDetailSheetVisibility(
  payload: MealItemDetailPayload | null,
  sheetRef: RefObject<AppBottomSheetRef | null>,
  resetSelection: () => void
): void {
  useEffect(() => {
    if (payload) {
      const frameId = requestAnimationFrame(() => {
        sheetRef.current?.open(1)
      })
      resetSelection()
      return () => cancelAnimationFrame(frameId)
    }

    sheetRef.current?.close()
    resetSelection()
  }, [payload, sheetRef, resetSelection])
}
