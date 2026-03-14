import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { LayoutAnimation, Pressable, View, StyleSheet } from 'react-native'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import type { CurrentDietPlanMealItem, Macros } from '@/lib/api/member-types'
import { formatCalorieDisplay, roundUpToTenth } from '@/lib/utils/numbers'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { MealItemRow } from './meal-item-row'

interface MealCardProps {
  title: string
  calories: number
  time: string
  icon: keyof typeof Ionicons.glyphMap
  macros: Macros
  items: CurrentDietPlanMealItem[]
}

export function MealCard({ title, calories, time, icon, macros, items }: Readonly<MealCardProps>) {
  const colors = useColors()
  const [expanded, setExpanded] = useState(false)

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setExpanded(prev => !prev)
  }

  const p = roundUpToTenth(macros.protein)
  const c = roundUpToTenth(macros.carbs)
  const f = roundUpToTenth(macros.fat)
  const itemSuffix = items.length === 1 ? '' : 's'
  const itemsLabel = items.length === 0 ? 'View items' : `View ${items.length} item${itemSuffix}`

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.card },
        shadows.sm
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name={icon} size={20} color={colors.accent} />
          </View>
          <View>
            <Text size='base' weight='semibold'>{title}</Text>
            <Text size='xs' weight='medium' muted>{time}</Text>
          </View>
        </View>
        <View style={styles.caloriesContainer}>
          <Text size='base' weight='bold' accent>{formatCalorieDisplay(calories)}</Text>
          <Text size='xs' weight='medium' muted style={styles.kcalLabel}>kcal</Text>
        </View>
      </View>

      <View style={styles.macrosRow}>
        <Text size='xs' muted>P: {p}g</Text>
        <Text size='xs' muted style={styles.macroDivider}>•</Text>
        <Text size='xs' muted>C: {c}g</Text>
        <Text size='xs' muted style={styles.macroDivider}>•</Text>
        <Text size='xs' muted>F: {f}g</Text>
      </View>

      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
      >
        <Text size='sm' weight='medium' muted>{itemsLabel}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {expanded && items.length === 0 && (
        <Text size='sm' weight='medium' muted>No items</Text>
      )}
      {expanded && items.length > 0 && (
        <View style={styles.itemsList}>
          {items.map(item => (
            <MealItemRow key={item.mealItemId} item={item} />
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
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2]
  },
  macroDivider: {
    marginHorizontal: spacing[1]
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2]
  },
  itemsList: {
    marginTop: spacing[1]
  }
})
