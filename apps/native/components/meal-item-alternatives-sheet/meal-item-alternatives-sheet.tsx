import { useCallback, useEffect, useMemo, useRef } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import { Spinner, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { useMealItemAlternatives } from '@/hooks/use-meal-item-alternatives'
import { useSetMealItemOverride } from '@/hooks/use-set-meal-item-override'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import { useMealActionsStore } from '@/store/meal-actions-store'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

export function MealItemAlternativesSheet() {
  const colors = useColors()
  const bottomSheetRef = useRef<BottomSheet>(null)
  const snapPoints = useMemo(() => ['50%', '70%', '90%'], [])

  const activeSheet = useMealActionsStore((state) => state.activeSheet)
  const selectedItem = useMealActionsStore((state) => state.selectedItem)
  const selectedMeal = useMealActionsStore((state) => state.selectedMeal)
  const assignmentId = useMealActionsStore((state) => state.assignmentId)
  const dateStr = useMealActionsStore((state) => state.dateStr)
  const closeSheet = useMealActionsStore((state) => state.closeSheet)

  const isOpen = activeSheet === 'alternatives'
  const hasContext = isOpen && selectedItem != null && selectedMeal != null && assignmentId != null

  const { data, isLoading, isError } = useMealItemAlternatives({
    assignmentId: assignmentId ?? '',
    dietPlanMealId: selectedMeal?.dietPlanMealId ?? '',
    mealItemId: selectedItem?.mealItemId ?? '',
    date: dateStr || undefined,
    enabled: !!hasContext,
  })

  const setOverride = useSetMealItemOverride()

  useEffect(() => {
    if (isOpen && hasContext) {
      bottomSheetRef.current?.snapToIndex(0)
    } else {
      bottomSheetRef.current?.close()
    }
  }, [isOpen, hasContext])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={closeSheet} />
    ),
    [closeSheet]
  )

  const handleSetSubstitute = useCallback(
    async (alt: FoodItemAlternative) => {
      if (selectedItem == null || selectedMeal == null || assignmentId == null) return
      try {
        await setOverride.mutateAsync({
          assignmentId,
          dietPlanMealId: selectedMeal.dietPlanMealId,
          mealItemId: selectedItem.mealItemId,
          body: {
            foodItemId: alt.foodItemId,
            quantity: alt.suggestedQuantityGrams,
            date: dateStr,
          },
        })
        closeSheet()
      } catch {
        // Error handled by mutation / could show toast
      }
    },
    [selectedItem, selectedMeal, assignmentId, dateStr, setOverride, closeSheet]
  )

  const alternatives = data?.data ?? []

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      onClose={closeSheet}
      backgroundStyle={{ backgroundColor: colors.appBg }}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
    >
      <View style={styles.header}>
        <Text size="lg" weight="bold">
          Alternatives for {selectedItem?.foodName ?? ''}
        </Text>
      </View>
      <BottomSheetScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && (
          <View style={styles.centered}>
            <Spinner size="lg" />
            <Text muted style={styles.loadingText}>
              Finding alternatives...
            </Text>
          </View>
        )}
        {!isLoading && isError && (
          <View style={styles.centered}>
            <Text muted>Failed to load alternatives. Please try again.</Text>
          </View>
        )}
        {!isLoading && !isError && alternatives.length === 0 && (
          <View style={styles.centered}>
            <Text muted>No alternatives found with similar nutrition.</Text>
          </View>
        )}
        {!isLoading &&
          !isError &&
          alternatives.length > 0 &&
          alternatives.map((alt) => (
            <View key={alt.foodItemId} style={[styles.row, { backgroundColor: colors.card }]}>
              <View style={styles.rowInfo}>
                <Text size="base" weight="semibold" numberOfLines={1}>
                  {alt.name}
                </Text>
                <Text size="sm" muted>
                  {alt.suggestedQuantityGrams}g · {alt.calories} kcal
                </Text>
              </View>
              <Pressable
                onPress={() => handleSetSubstitute(alt)}
                disabled={setOverride.isPending}
                style={({ pressed }) => [
                  styles.useButton,
                  { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text size="xs" weight="semibold" style={{ color: colors.white }}>
                  Use
                </Text>
              </Pressable>
            </View>
          ))}
      </BottomSheetScrollView>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
  },
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  centered: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  loadingText: {
    marginTop: spacing[3],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  rowInfo: {
    flex: 1,
  },
  useButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
  },
})
