/**
 * Meals section: title, optional “undo swaps” for the selected day, then loading /
 * error / empty state or meal cards.
 */

import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { Pressable, StyleSheet, View } from 'react-native'

import { MealCard } from '@/components/meal-card'
import { Spinner, Text } from '@/components/ui'
import type { MealItemDetailPayload } from '@/components/meal-item-detail-sheet'
import { useColors } from '@/hooks/use-theme-color'
import { useUndoSwapsForSelectedDay } from '@/hooks/use-undo-swaps-for-selected-day'
import type { CurrentDietPlanMeal, CurrentDietPlanMealItem } from '@/lib/api/member-types'
import { formatMealTime, MEAL_TYPE_ICONS } from '@/lib/constants/meals'
import { roundUpToTenth } from '@/lib/utils/numbers'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

interface HomeMealsSectionProps {
  isLoading: boolean
  error: Error | null
  meals: CurrentDietPlanMeal[]
  selectedDate: Date
  /** When present, meal cards show mark-as-consumed and pass it to the API. */
  dietPlanAssignmentId?: string
  assignmentStartDate?: string
  assignmentEndDate?: string
  maxPastDays?: number
  onMealItemPress?: (params: MealItemDetailPayload) => void
}

export function HomeMealsSection({
  isLoading,
  error,
  meals,
  selectedDate,
  dietPlanAssignmentId,
  assignmentStartDate,
  assignmentEndDate,
  maxPastDays,
  onMealItemPress,
}: Readonly<HomeMealsSectionProps>) {
  const colors = useColors()
  const isToday = dayjs(selectedDate).isSame(dayjs(), 'day')
  const consumedDate = dayjs(selectedDate).format('YYYY-MM-DD')

  const {
    canUndoSwaps,
    requestUndoWithConfirmation,
    isUndoingSwaps,
  } = useUndoSwapsForSelectedDay(meals, dietPlanAssignmentId, consumedDate)

  const handleMealItemPress = (
    item: CurrentDietPlanMealItem,
    dietPlanMealId: string
  ) => {
    if (!dietPlanAssignmentId) return
    onMealItemPress?.({
      item,
      dietPlanAssignmentId,
      dietPlanMealId,
      consumedDate,
    })
  }

  return (
    <>
      <View style={styles.mealsHeader}>
        <Text size='lg' weight='bold'>
          {isToday ? "Today's Meals" : dayjs(selectedDate).format('MMMM D') + ' Meals'}
        </Text>
        {canUndoSwaps ? (
          <Pressable
            onPress={requestUndoWithConfirmation}
            disabled={isUndoingSwaps}
            hitSlop={8}
            accessibilityRole='button'
            accessibilityLabel='Undo all meal swaps for this day'
          >
            <Text
              size='sm'
              weight='semibold'
              style={{ color: isUndoingSwaps ? colors.muted : colors.accent }}
            >
              Undo swaps
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading && (
        <View style={styles.loadingState}>
          <Spinner size='lg' />
        </View>
      )}

      {error && (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name='alert-circle-outline' size={32} color={colors.danger} />
          <Text size='sm' muted style={styles.emptyText}>
            {error.message}
          </Text>
        </View>
      )}

      {!isLoading && !error && meals.length === 0 && (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name='restaurant-outline' size={32} color={colors.muted} />
          <Text size='base' weight='semibold' style={styles.emptyTitle}>
            No meals planned
          </Text>
          <Text size='sm' muted style={styles.emptyText}>
            You don't have a diet plan assigned for this date yet.
          </Text>
        </View>
      )}

      {!isLoading &&
        !error &&
        meals.map(meal => (
          <MealCard
            key={meal.dietPlanMealId}
            title={meal.mealName}
            calories={roundUpToTenth(meal.macros.calories)}
            time={formatMealTime(meal.mealType, meal.scheduledTime)}
            icon={MEAL_TYPE_ICONS[meal.mealType.toLowerCase()] ?? 'restaurant-outline'}
            macros={meal.macros}
            items={meal.mealItems}
            dietPlanAssignmentId={dietPlanAssignmentId}
            dietPlanMealId={meal.dietPlanMealId}
            consumed={meal.consumed}
            consumedDate={consumedDate}
            assignmentStartDate={assignmentStartDate}
            assignmentEndDate={assignmentEndDate}
            maxPastDays={maxPastDays}
            onMealItemPress={item => handleMealItemPress(item, meal.dietPlanMealId)}
          />
        ))}
    </>
  )
}

const styles = StyleSheet.create({
  mealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  loadingState: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
    borderRadius: radii.xl,
  },
  emptyTitle: {
    marginTop: spacing[2],
  },
  emptyText: {
    marginTop: spacing[1],
    textAlign: 'center',
  },
})
