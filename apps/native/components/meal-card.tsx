import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { MealItemRow } from './meal-item-row'

interface MealCardProps {
  title: string
  calories: number
  time: string
  icon: keyof typeof Ionicons.glyphMap
  items: CurrentDietPlanMealItem[]
}

export function MealCard({ title, calories, time, icon, items }: Readonly<MealCardProps>) {
  const colors = useColors()

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card
        },
        shadows.sm
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons
              name={icon}
              size={20}
              color={colors.accent}
            />
          </View>
          <View>
            <Text
              size='base'
              weight='semibold'
            >
              {title}
            </Text>
            <Text
              size='xs'
              weight='medium'
              muted
            >
              {time}
            </Text>
          </View>
        </View>
        <View style={styles.caloriesContainer}>
          <Text
            size='base'
            weight='bold'
            accent
          >
            {calories}
          </Text>
          <Text
            size='xs'
            weight='medium'
            muted
            style={styles.kcalLabel}
          >
            kcal
          </Text>
        </View>
      </View>
      {items.length === 0 ? (
        <Text
          size='sm'
          weight='medium'
          muted
        >
          No items
        </Text>
      ) : (
        <View style={styles.itemsList}>
          {items.map(item => (
            <MealItemRow
              key={item.mealItemId}
              item={item}
            />
          ))}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.sm,
    padding: spacing[4],
    marginBottom: spacing[3]
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3]
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3]
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  kcalLabel: {
    marginLeft: spacing[0.5]
  },
  itemsList: {
    marginTop: spacing[1]
  }
})
