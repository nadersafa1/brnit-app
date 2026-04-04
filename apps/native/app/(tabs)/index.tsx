import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { CalendarStrip } from '@/components/calendar-strip'
import { HomeHeader } from '@/components/home-header'
import { HomeMealsSection } from '@/components/home-meals-section'
import { HomeProgressCard } from '@/components/home-progress-card'
import { MealItemDetailSheet, type MealItemDetailPayload } from '@/components/meal-item-detail-sheet'
import { useConsumptionStreak } from '@/hooks/use-consumption-streak'
import { useCurrentDietPlan } from '@/hooks/use-current-diet-plan'
import { useDayProgress } from '@/hooks/use-day-progress'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { getMaxConsumptionPastDays } from '@/lib/consumption-date-window'
import { getDayForDate } from '@/lib/helpers/diet-plan'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

export default function Home() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { data: session } = authClient.useSession()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedMealItem, setSelectedMealItem] = useState<MealItemDetailPayload | null>(null)
  const maxConsumptionPastDays = getMaxConsumptionPastDays()

  const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
  const {
    data: dietPlanData,
    isLoading,
    error
  } = useCurrentDietPlan({
    from: dateStr,
    to: dateStr
  })

  const day = useMemo(() => getDayForDate(dietPlanData, dateStr), [dietPlanData, dateStr])
  const meals = day?.meals ?? []
  const progress = useDayProgress(day, meals)
  const { data: streakData, isLoading: streakLoading, error: streakError } = useConsumptionStreak()

  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const userImageUrl = session?.user?.image ?? undefined
  const isToday = dayjs(selectedDate).isSame(dayjs(), 'day')

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => dayjs(prev).add(1, 'day').toDate())
  }, [])

  const goToPreviousDay = useCallback(() => {
    setSelectedDate((prev) => dayjs(prev).subtract(1, 'day').toDate())
  }, [])

  const swipeLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .runOnJS(true)
    .onEnd(goToNextDay)
  const swipeRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .runOnJS(true)
    .onEnd(goToPreviousDay)
  const swipeGesture = Gesture.Simultaneous(swipeLeft, swipeRight)

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <GestureDetector gesture={swipeGesture}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader
            userName={userName}
            userImageUrl={userImageUrl}
          />
          <CalendarStrip
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
          <HomeProgressCard
            hasPlan={progress.hasPlan}
            isToday={isToday}
            selectedDate={selectedDate}
            caloriesConsumed={progress.caloriesConsumed}
            caloriesGoal={progress.caloriesGoal}
            remainingCalories={progress.remainingCalories}
            proteinConsumed={progress.proteinConsumed}
            proteinGoal={progress.proteinGoal}
            carbsConsumed={progress.carbsConsumed}
            carbsGoal={progress.carbsGoal}
            fatConsumed={progress.fatConsumed}
            fatGoal={progress.fatGoal}
            streak={streakData?.streak ?? 0}
            streakLoading={streakLoading}
            streakError={streakError}
          />
          <HomeMealsSection
            isLoading={isLoading}
            error={error ?? null}
            meals={meals}
            selectedDate={selectedDate}
            dietPlanAssignmentId={dietPlanData?.data?.assignment?.id}
            assignmentStartDate={dietPlanData?.data?.assignment?.startDate}
            assignmentEndDate={dietPlanData?.data?.assignment?.endDate}
            maxPastDays={maxConsumptionPastDays}
            onMealItemPress={setSelectedMealItem}
          />
        </ScrollView>
      </GestureDetector>

      <BottomNav activeTab='home' />
      <MealItemDetailSheet
        payload={selectedMealItem}
        onClose={() => setSelectedMealItem(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  decorativeBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill
  },
  scrollView: {
    flex: 1
  },
  contentContainer: {
    paddingHorizontal: spacing[4]
  }
})
