import { View, StyleSheet } from 'react-native'
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'

export type SheetFooterProps = Readonly<
  BottomSheetFooterProps & { children: React.ReactNode }
>

/**
 * Shared footer container for app bottom sheets.
 * Handles BottomSheetFooter, safe area inset, and themed container (background, border, padding).
 * Pass footer content (e.g. buttons) as children; layout (row/column) is up to you.
 */
export function SheetFooter({ children, ...footerProps }: SheetFooterProps) {
  const colors = useColors()
  const insets = useSafeAreaInsets()

  return (
    <BottomSheetFooter {...footerProps} bottomInset={insets.bottom}>
      <View
        style={[
          styles.container,
          { backgroundColor: colors.appBg, borderTopColor: colors.border },
        ]}
      >
        {children}
      </View>
    </BottomSheetFooter>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
  },
})
