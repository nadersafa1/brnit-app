import { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'

/**
 * Shared backdrop for app bottom sheets.
 * Appears when sheet is open (index >= 0), disappears when closed (index -1).
 */
export function SheetBackdrop(props: Readonly<BottomSheetBackdropProps>) {
  return (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
    />
  )
}
