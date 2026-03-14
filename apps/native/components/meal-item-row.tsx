import { Pressable, View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import type { SelectedMeal } from '@/store/meal-actions-store'
import { spacing } from '@/theme/spacing'

interface MealItemRowProps {
  item: CurrentDietPlanMealItem
  meal?: SelectedMeal | null
  onPress?: (item: CurrentDietPlanMealItem, meal: SelectedMeal) => void
}

export function MealItemRow({ item, meal, onPress }: Readonly<MealItemRowProps>) {
  const primary = `${item.foodName} (${item.quantity})`
  const hasReplacement = item.isOverridden && item.originalFoodName !== undefined && item.originalFoodName !== null

  const content = (
    <>
      <Text size='sm' weight='medium'>
        {primary}
      </Text>
      {hasReplacement ? (
        <Text size='xs' weight='normal' muted style={styles.override}>
          replaced {item.originalFoodName}
          {typeof item.originalQuantity === 'number' ? ` (${item.originalQuantity})` : ''}
        </Text>
      ) : null}
    </>
  )

  const handlePress = () => {
    if (meal && onPress) onPress(item, meal)
  }

  return (
    <View style={styles.row}>
      {meal && onPress ? (
        <Pressable
          onPress={handlePress}
          hitSlop={8}
          style={({ pressed }) => [styles.pressable, { opacity: pressed ? 0.7 : 1 }]}
        >
          {content}
        </Pressable>
      ) : (
        content
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    marginBottom: spacing[1],
  },
  pressable: {
    minHeight: 44,
    justifyContent: 'center',
  },
  override: {
    marginTop: spacing[0.5],
    marginLeft: spacing[2],
  },
})
