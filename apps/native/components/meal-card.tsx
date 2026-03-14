import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet, Pressable } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import type { CurrentDietPlanMealItem } from '@/lib/api/member-types'
import type { SelectedMeal } from '@/store/meal-actions-store'
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
  consumed?: boolean
  onMarkConsumed?: () => void
  meal?: { dietPlanMealId: string }
  onMealItemPress?: (item: CurrentDietPlanMealItem, meal: SelectedMeal) => void
}

export function MealCard({
  title,
  calories,
  time,
  icon,
  items,
  consumed = false,
  onMarkConsumed,
  meal,
  onMealItemPress,
}: Readonly<MealCardProps>) {
  const colors = useColors()

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card, ...(consumed ? { opacity: 0.85 } : {}) },
        shadows.sm,
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
          <View>
            <Text size="base" weight="semibold">
              {title}
            </Text>
            <Text size="xs" weight="medium" muted>
              {time}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          {onMarkConsumed != null && (
            <Pressable
              onPress={onMarkConsumed}
              disabled={consumed}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={({ pressed: p }) => [
                styles.markConsumedButton,
                {
                  backgroundColor: consumed ? colors.surfaceAlt : colors.accent,
                  opacity: p ? 0.8 : 1,
                },
              ]}
            >
              {consumed ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : (
                <Text size="xs" weight="semibold" style={{ color: colors.white }}>
                  Done
                </Text>
              )}
            </Pressable>
          )}
          <View style={styles.caloriesContainer}>
            <Text size="base" weight="bold" accent>
              {calories}
            </Text>
            <Text size="xs" weight="medium" muted style={styles.kcalLabel}>
              kcal
            </Text>
          </View>
        </View>
      </View>
      {items.length === 0 ? (
        <Text size="sm" weight="medium" muted>
          No items
        </Text>
      ) : (
        <View style={styles.itemsList}>
          {items.map(item => (
            <MealItemRow
              key={item.mealItemId}
              item={item}
              meal={meal}
              onPress={onMealItemPress}
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
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  markConsumedButton: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  kcalLabel: {
    marginLeft: spacing[0.5],
  },
  itemsList: {
    marginTop: spacing[1],
  },
})
