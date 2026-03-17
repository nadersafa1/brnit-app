import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
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
import { getDayForDate } from '@/lib/helpers/diet-plan'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

export default function Home() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { data: session } = authClient.useSession()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [selectedMealItem, setSelectedMealItem] = useState<MealItemDetailPayload | null>(null)

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

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader userName={userName} userImageUrl={userImageUrl} />
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
          onMealItemPress={setSelectedMealItem}
        />
      </ScrollView>

      <BottomNav activeTab='home' />
      {selectedMealItem ? (
        <MealItemDetailSheet payload={selectedMealItem} onClose={() => setSelectedMealItem(null)} />
      ) : null}
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
