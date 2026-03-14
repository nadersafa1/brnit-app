import { forwardRef, useCallback, useMemo } from 'react'
import { View, StyleSheet } from 'react-native'
import BottomSheet, { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet'
import { Button, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { useMealActionsStore } from '@/store/meal-actions-store'
import type { SelectedMeal } from '@/store/meal-actions-store'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { spacing } from '@/theme/spacing'

export type MealItemDetailsSheetProps = {
  mealItem: { item: CurrentDietPlanMealItem; meal: SelectedMeal } | null
  onClose: () => void
}

export const MealItemDetailsSheet = forwardRef<BottomSheet, MealItemDetailsSheetProps>(
  function MealItemDetailsSheet({ mealItem, onClose }, ref) {
    const colors = useColors()
    const snapPoints = useMemo(() => ['40%', '50%'], [])

    const openAlternatives = useMealActionsStore((state) => state.openAlternatives)

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      ),
      []
    )

    const handleSheetClose = useCallback(() => {
      onClose()
    }, [onClose])

    const handleShowAlternatives = useCallback(() => {
      if (mealItem) {
        openAlternatives(mealItem.item, mealItem.meal)
        onClose()
      }
    }, [mealItem, openAlternatives, onClose])

    const hasReplacement =
      mealItem?.item.isOverridden === true &&
      mealItem?.item.originalFoodName !== undefined &&
      mealItem?.item.originalFoodName !== null

    const item = mealItem?.item
    const meal = mealItem?.meal

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onClose={handleSheetClose}
        backgroundStyle={{ backgroundColor: colors.appBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <View style={styles.content}>
          {item != null && meal != null ? (
            <>
              <Text size="lg" weight="bold" style={styles.title}>
                {item.foodName}
              </Text>
              <Text size="sm" muted style={styles.quantity}>
                Quantity: {item.quantity}
              </Text>
              {hasReplacement && (
                <Text size="xs" muted style={styles.override}>
                  Replaced: {item.originalFoodName}
                  {typeof item.originalQuantity === 'number'
                    ? ` (${item.originalQuantity})`
                    : ''}
                </Text>
              )}
              <View style={styles.actions}>
                <Button onPress={handleShowAlternatives} variant="soft" style={styles.actionButton}>
                  Show alternatives
                </Button>
                <Button onPress={handleShowAlternatives} variant="outline" style={styles.actionButton}>
                  Set alternative
                </Button>
              </View>
            </>
          ) : null}
        </View>
      </BottomSheet>
    )
  }
)

MealItemDetailsSheet.displayName = 'MealItemDetailsSheet'

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  title: {
    marginBottom: spacing[1],
  },
  quantity: {
    marginBottom: spacing[1],
  },
  override: {
    marginBottom: spacing[4],
  },
  actions: {
    gap: spacing[2],
  },
  actionButton: {
    flex: 1,
  },
})
