import { Ionicons } from '@expo/vector-icons'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { CalorieRing } from '@/components/calorie-ring'
import { CalendarStrip } from '@/components/calendar-strip'
import { MacroBar } from '@/components/macro-bar'
import { MealCard } from '@/components/meal-card'
import { Spinner, Text } from '@/components/ui'
import { useCurrentDietPlan } from '@/hooks/use-current-diet-plan'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import type { CurrentDietPlanMeal } from '@/lib/api/member-types'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

const MEAL_TYPE_ICONS: Record<string, 'sunny-outline' | 'partly-sunny-outline' | 'cafe-outline' | 'moon-outline'> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  snack: 'cafe-outline',
  dinner: 'moon-outline',
}

const caloriesGoal = 2000
const macros = {
  protein: { current: 85, goal: 120 },
  carbs: { current: 145, goal: 200 },
  fat: { current: 48, goal: 65 },
}

function formatMealTime(mealType: string): string {
  const times: Record<string, string> = {
    breakfast: '8:00 AM',
    lunch: '12:30 PM',
    snack: '3:30 PM',
    dinner: '7:00 PM',
  }
  return times[mealType.toLowerCase()] ?? '12:00 PM'
}

function getMealsForDate(data: ReturnType<typeof useCurrentDietPlan>['data'], dateStr: string): CurrentDietPlanMeal[] {
  if (!data?.data) return []
  const day = data.data.days.find(d => d.date === dateStr)
  return day?.meals ?? []
}

export default function Home() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { data: session } = authClient.useSession()
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
  const {
    data: dietPlanData,
    isLoading,
    error,
  } = useCurrentDietPlan({
    from: dateStr,
    to: dateStr,
  })

  const meals = useMemo(() => getMealsForDate(dietPlanData, dateStr), [dietPlanData, dateStr])

  const caloriesConsumed = 0
  const remainingCalories = caloriesGoal - caloriesConsumed

  const userName = session?.user?.name?.split(' ')[0] || 'there'
  const isToday = dayjs(selectedDate).isSame(dayjs(), 'day')

  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.decorativeBlob, { backgroundColor: colors.pastelPurple }]} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text size='lg' weight='bold' style={{ color: colors.white }}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text size='sm' weight='medium' muted>
                Good morning 👋
              </Text>
              <Text size='lg' weight='bold'>
                {userName}
              </Text>
            </View>
          </View>
          <Pressable style={[styles.notificationButton, { backgroundColor: colors.card }, shadows.sm]}>
            <Ionicons name='notifications-outline' size={20} color={colors.ink} />
          </Pressable>
        </View>

        <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        <View style={[styles.calorieCard, { backgroundColor: colors.card }, shadows.md]}>
          <View style={styles.cardHeader}>
            <Text size='xl' weight='bold'>
              {isToday ? "Today's Progress" : dayjs(selectedDate).format('MMMM D')}
            </Text>
            <View style={[styles.weekBadge, { backgroundColor: colors.surfaceAlt }]}>
              <Text size='xs' weight='semibold' style={{ color: colors.subtle }}>
                This Week
              </Text>
              <Ionicons name='chevron-down' size={14} color={colors.muted} style={{ marginLeft: 4 }} />
            </View>
          </View>

          <View style={styles.ringContainer}>
            <CalorieRing consumed={caloriesConsumed} goal={caloriesGoal} />
          </View>

          <View style={styles.remainingContainer}>
            <View style={[styles.remainingBadge, { backgroundColor: 'rgba(53, 196, 139, 0.15)' }]}>
              <Text size='sm' weight='semibold' style={{ color: colors.success }}>
                {remainingCalories} kcal remaining
              </Text>
            </View>
          </View>

          <View style={styles.macrosRow}>
            <MacroBar label='Protein' current={macros.protein.current} goal={macros.protein.goal} color='accent' />
            <MacroBar label='Carbs' current={macros.carbs.current} goal={macros.carbs.goal} color='info' />
            <MacroBar label='Fat' current={macros.fat.current} goal={macros.fat.goal} color='success' />
          </View>
        </View>

        <View style={styles.mealsHeader}>
          <Text size='lg' weight='bold'>
            {isToday ? "Today's Meals" : dayjs(selectedDate).format('MMMM D') + ' Meals'}
          </Text>
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
              calories={0}
              time={formatMealTime(meal.mealType)}
              icon={MEAL_TYPE_ICONS[meal.mealType.toLowerCase()] ?? 'restaurant-outline'}
              items={meal.mealItems}
            />
          ))}
      </ScrollView>

      <BottomNav activeTab='home' />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  decorativeBlob: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 256,
    height: 256,
    borderRadius: radii.pill,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[6],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    marginRight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCard: {
    borderRadius: radii.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radii.pill,
  },
  ringContainer: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  remainingContainer: {
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  remainingBadge: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radii.pill,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  mealsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  addMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIcon: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
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
