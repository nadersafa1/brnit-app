import { StyleSheet, Pressable, View } from 'react-native'
import { Text } from '@/components/ui'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { formatCalorieDisplay, formatQuantityWithUnit, roundUpToTenth } from '@/lib/utils/numbers'
import { spacing } from '@/theme/spacing'

interface MealItemRowProps {
  item: CurrentDietPlanMealItem
  onPress?: () => void
}

export function MealItemRow({ item, onPress }: Readonly<MealItemRowProps>) {
  const unit = item.unit ?? '100g'
  const primary = `${item.foodName} (${formatQuantityWithUnit(item.quantity, unit)})`
  const hasReplacement = item.isOverridden && item.originalFoodName != null
  const originalQtyText =
    typeof item.originalQuantity === 'number'
      ? ` (${formatQuantityWithUnit(item.originalQuantity, item.originalUnit ?? '100g')})`
      : ''
  const caloriesText = formatCalorieDisplay(roundUpToTenth(item.macros?.calories ?? 0))

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
    >
      <View style={styles.content}>
        <Text
          size='sm'
          weight='medium'
        >
          {primary}
        </Text>
        <Text
          size='xs'
          weight='normal'
          muted
        >
          {caloriesText} kcal
        </Text>
      </View>
      {hasReplacement ? (
        <Text
          size='xs'
          weight='normal'
          muted
          style={styles.override}
        >
          replaced {item.originalFoodName}
          {originalQtyText}
        </Text>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing[1]
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing[1]
  },
  override: {
    marginTop: spacing[0.5],
    marginLeft: spacing[2]
  }
})
