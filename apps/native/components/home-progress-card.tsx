/**
 * Progress card: calorie ring, remaining badge, macro bars, or no-plan message.
 * Purely presentational; receives all values as props.
 */

import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { View, StyleSheet } from 'react-native'
import { CalorieRing } from '@/components/calorie-ring'
import { MacroBar } from '@/components/macro-bar'
import { StreakBadge } from '@/components/streak-badge'
import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { formatCalorieDisplay } from '@/lib/utils/numbers'

interface HomeProgressCardProps {
  hasPlan: boolean
  isToday: boolean
  selectedDate: Date
  caloriesConsumed: number
  caloriesGoal: number
  remainingCalories: number
  proteinConsumed: number
  proteinGoal: number
  carbsConsumed: number
  carbsGoal: number
  fatConsumed: number
  fatGoal: number
  /** Current consumption streak; badge shown in top-right. */
  streak?: number
  streakLoading?: boolean
  streakError?: unknown
}

export function HomeProgressCard({
  hasPlan,
  isToday,
  selectedDate,
  caloriesConsumed,
  caloriesGoal,
  remainingCalories,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  fatConsumed,
  fatGoal,
  streak = 0,
  streakLoading = false,
  streakError
}: Readonly<HomeProgressCardProps>) {
  const colors = useColors()

  return (
    <View style={[styles.calorieCard, { backgroundColor: colors.card }, shadows.md]}>
      <View style={styles.cardHeader}>
        <Text
          size='xl'
          weight='bold'
        >
          {isToday ? "Today's Progress" : dayjs(selectedDate).format('MMMM D')}
        </Text>
        <StreakBadge
          streak={streak}
          isLoading={streakLoading}
          error={streakError}
          numberSize='xl'
        />
      </View>

      {hasPlan ? (
        <>
          <View style={styles.ringContainer}>
            <CalorieRing
              consumed={caloriesConsumed}
              goal={caloriesGoal}
            />
          </View>
          <View style={styles.remainingContainer}>
            <View style={[styles.remainingBadge, { backgroundColor: 'rgba(53, 196, 139, 0.15)' }]}>
              <Text
                size='sm'
                weight='semibold'
                style={{ color: colors.success }}
              >
                {formatCalorieDisplay(remainingCalories)} kcal remaining
              </Text>
            </View>
          </View>
          <View style={styles.macrosRow}>
            <MacroBar
              label='Protein'
              current={proteinConsumed}
              goal={proteinGoal}
              color='accent'
            />
            <MacroBar
              label='Carbs'
              current={carbsConsumed}
              goal={carbsGoal}
              color='info'
            />
            <MacroBar
              label='Fat'
              current={fatConsumed}
              goal={fatGoal}
              color='success'
            />
          </View>
        </>
      ) : (
        <View style={styles.noPlanMessage}>
          <Ionicons
            name='calendar-outline'
            size={32}
            color={colors.muted}
          />
          <Text
            size='base'
            weight='medium'
            muted
            style={styles.noPlanText}
          >
            No plan assigned for this day.
          </Text>
          <Text
            size='sm'
            muted
            style={styles.noPlanSubtext}
          >
            You don&apos;t have a diet plan assigned for {isToday ? 'today' : dayjs(selectedDate).format('MMMM D')}.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  calorieCard: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4]
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4]
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: spacing[5]
  },
  remainingContainer: {
    alignItems: 'center',
    marginBottom: spacing[5]
  },
  remainingBadge: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing[4]
  },
  noPlanMessage: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4]
  },
  noPlanText: {
    marginTop: spacing[2],
    textAlign: 'center'
  },
  noPlanSubtext: {
    marginTop: spacing[1],
    textAlign: 'center'
  }
})
