import { StyleSheet, Pressable, View } from 'react-native'
import { Text } from '@/components/ui'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { formatCalorieDisplay, roundUpToTenth } from '@/lib/utils/numbers'
import { spacing } from '@/theme/spacing'

interface MealItemRowProps {
  item: CurrentDietPlanMealItem
}

export function MealItemRow({ item }: Readonly<MealItemRowProps>) {
  const primary = `${item.foodName} (${item.quantity}g)`
  const hasReplacement = item.isOverridden && item.originalFoodName != null
  const caloriesText = formatCalorieDisplay(roundUpToTenth(item.macros?.calories ?? 0))

  // Reserved for meal item details bottom sheet
  const onPress = () => {}

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
          {typeof item.originalQuantity === 'number' ? ` (${item.originalQuantity})` : ''}
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
