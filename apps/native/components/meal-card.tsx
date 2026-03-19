import { Text } from '@/components/ui'
import { useMarkMealConsumed } from '@/hooks/use-mark-meal-consumed'
import { useColors } from '@/hooks/use-theme-color'
import { useUnmarkMealConsumed } from '@/hooks/use-unmark-meal-consumed'
import { getConsumptionMarkEligibility } from '@/lib/consumption-date-window'
import type { CurrentDietPlanMealItem, Macros } from '@/lib/api/member-types'
import { formatCalorieDisplay, roundUpToTenth } from '@/lib/utils/numbers'
import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { shadows } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { ActivityIndicator, LayoutAnimation, Pressable, StyleSheet, View } from 'react-native'
import { MealItemRow } from './meal-item-row'

interface MealCardProps {
  title: string
  calories: number
  time: string
  icon: keyof typeof Ionicons.glyphMap
  macros: Macros
  items: CurrentDietPlanMealItem[]
  /** When provided, shows mark-as-consumed button. Omit when no plan for the day. */
  dietPlanAssignmentId?: string
  dietPlanMealId?: string
  consumed?: boolean
  consumedDate?: string
  assignmentStartDate?: string
  assignmentEndDate?: string
  maxPastDays?: number
  onMealItemPress?: (item: CurrentDietPlanMealItem) => void
}

export function MealCard({
  title,
  calories,
  time,
  icon,
  macros,
  items,
  dietPlanAssignmentId,
  dietPlanMealId,
  consumed = false,
  consumedDate,
  assignmentStartDate,
  assignmentEndDate,
  maxPastDays,
  onMealItemPress
}: Readonly<MealCardProps>) {
  const colors = useColors()
  const [expanded, setExpanded] = useState(false)
  const markConsumed = useMarkMealConsumed()
  const unmarkConsumed = useUnmarkMealConsumed()

  const showConsumedControl = Boolean(dietPlanAssignmentId && dietPlanMealId && consumedDate)
  const markEligibility = useMemo(() => {
    if (!showConsumedControl) return { allowed: false }
    return getConsumptionMarkEligibility(String(consumedDate), {
      maxPastDays,
      assignmentStartDate,
      assignmentEndDate,
    })
  }, [assignmentEndDate, assignmentStartDate, consumedDate, maxPastDays, showConsumedControl])
  const isConsumedActionPending = markConsumed.isPending || unmarkConsumed.isPending

  const handleConsumedPress = () => {
    if (!dietPlanAssignmentId || !dietPlanMealId || !consumedDate) return
    if (consumed) {
      unmarkConsumed.mutate({ dietPlanAssignmentId, dietPlanMealId, consumedDate })
    } else {
      markConsumed.mutate({ dietPlanAssignmentId, dietPlanMealId, consumedDate })
    }
  }

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
    <View style={[styles.container, { backgroundColor: colors.card }, shadows.sm]}>
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
        <View style={styles.headerRight}>
          <View style={styles.caloriesContainer}>
            <Text
              size='base'
              weight='bold'
              accent
            >
              {formatCalorieDisplay(calories)}
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
          {/* Mark/unmark consumed: one icon, toggles between outline (unconsumed) and filled (consumed). */}
          {showConsumedControl &&
            (markEligibility.allowed ? (
              <Pressable
                onPress={handleConsumedPress}
                disabled={isConsumedActionPending}
                style={({ pressed }) => [styles.consumedButton, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                {isConsumedActionPending ? (
                  <ActivityIndicator
                    size='small'
                    color={colors.accent}
                  />
                ) : (
                  <Ionicons
                    name={consumed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                    size={28}
                    color={consumed ? colors.muted : colors.accent}
                  />
                )}
              </Pressable>
            ) : null)}
        </View>
      </View>

      <View style={styles.macrosRow}>
        <Text
          size='xs'
          muted
        >
          P: {p}g
        </Text>
        <Text
          size='xs'
          muted
          style={styles.macroDivider}
        >
          •
        </Text>
        <Text
          size='xs'
          muted
        >
          C: {c}g
        </Text>
        <Text
          size='xs'
          muted
          style={styles.macroDivider}
        >
          •
        </Text>
        <Text
          size='xs'
          muted
        >
          F: {f}g
        </Text>
      </View>

      <Pressable
        onPress={toggleExpanded}
        style={({ pressed }) => [styles.toggleRow, pressed && { opacity: 0.7 }]}
      >
        <Text
          size='sm'
          weight='medium'
          muted
        >
          {itemsLabel}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {expanded && items.length === 0 && (
        <Text
          size='sm'
          weight='medium'
          muted
        >
          No items
        </Text>
      )}
      {expanded && items.length > 0 && (
        <View style={styles.itemsList}>
          {items.map(item => (
            <MealItemRow
              key={item.mealItemId}
              item={item}
              onPress={() => onMealItemPress?.(item)}
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2]
  },
  caloriesContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  kcalLabel: {
    marginLeft: spacing[0.5]
  },
  consumedButton: {
    padding: spacing[1],
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 36,
    minHeight: 36
  },
  consumedDisabledText: {
    minWidth: 36,
    maxWidth: 90,
    textAlign: 'center',
    paddingHorizontal: spacing[1]
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
