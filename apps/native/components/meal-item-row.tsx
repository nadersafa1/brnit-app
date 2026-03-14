import { StyleSheet, Pressable } from 'react-native'
import { Text } from '@/components/ui'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { spacing } from '@/theme/spacing'

interface MealItemRowProps {
  item: CurrentDietPlanMealItem
}

export function MealItemRow({ item }: Readonly<MealItemRowProps>) {
  const primary = `${item.foodName} (${item.quantity})`
  const hasReplacement = item.isOverridden && item.originalFoodName !== undefined && item.originalFoodName !== null

  const onPress = () => {
    console.log('onPress', item)
    // TODO: open the meal item details bottom sheet
  }

  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
    >
      <Text
        size='sm'
        weight='medium'
      >
        {primary}
      </Text>
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
  override: {
    marginTop: spacing[0.5],
    marginLeft: spacing[2]
  }
})
