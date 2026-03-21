import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'
import { View, StyleSheet } from 'react-native'
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'

import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'

import { DEFAULT_SNAP_POINTS } from './constants'
import { SheetBackdrop } from './sheet-backdrop'

export type AppBottomSheetRef = {
  open: (snapIndex?: number) => void
  close: () => void
}

export type AppBottomSheetProps = {
  /** Override default snap points if needed (e.g. dynamic sizing). */
  snapPoints?: readonly string[] | string[]
  /** Called when the sheet is closed (pan down or programmatic close). */
  onClose?: () => void
  /** Simple header: title only. Ignored if renderHeader is provided. */
  headerTitle?: string
  /** Custom header (e.g. title + back button). Overrides headerTitle. */
  renderHeader?: () => React.ReactNode
  /** Optional footer. Use SheetFooter for consistent container styling. */
  footerComponent?: (props: BottomSheetFooterProps) => React.ReactNode
  /** Sheet body. Rendered inside BottomSheetScrollView with shared content padding. */
  children: React.ReactNode
  /** Set true for forms so the keyboard does not dismiss on tap. */
  keyboardShouldPersistTaps?: boolean
}

function renderHeaderContent(headerTitle?: string, renderHeader?: () => React.ReactNode): React.ReactNode {
  if (renderHeader) return renderHeader()
  if (headerTitle != null) {
    return (
      <View style={styles.header}>
        <Text
          size='lg'
          weight='bold'
        >
          {headerTitle}
        </Text>
      </View>
    )
  }
  return null
}

export const AppBottomSheet = forwardRef<AppBottomSheetRef, AppBottomSheetProps>(function AppBottomSheet(
  { snapPoints, onClose, headerTitle, renderHeader, footerComponent, children, keyboardShouldPersistTaps = false },
  ref
) {
  const colors = useColors()
  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const points = snapPoints ?? DEFAULT_SNAP_POINTS

  const open = useCallback((snapIndex = 0) => {
    const sheet = bottomSheetRef.current
    if (!sheet) return

    const targetIndex = Math.max(0, Math.min(snapIndex, points.length - 1))
    sheet.present()

    requestAnimationFrame(() => {
      if (targetIndex > 0) {
        sheet.snapToIndex(targetIndex)
      }
    })
  }, [points.length])

  const close = useCallback(() => {
    bottomSheetRef.current?.dismiss()
  }, [])

  useImperativeHandle(ref, () => ({ open, close }), [open, close])

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={[...points]}
      enablePanDownToClose
      backdropComponent={SheetBackdrop}
      footerComponent={footerComponent}
      onDismiss={onClose}
      keyboardBehavior='interactive'
      android_keyboardInputMode='adjustResize'
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: colors.appBg }}
      handleIndicatorStyle={{ backgroundColor: colors.pastelPurple }}
    >
      {renderHeaderContent(headerTitle, renderHeader)}
      <BottomSheetScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps ? 'handled' : 'never'}
      >
        {children}
      </BottomSheetScrollView>
    </BottomSheetModal>
  )
})

AppBottomSheet.displayName = 'AppBottomSheet'

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2]
  },
  content: {
    flex: 1
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4]
  }
})
