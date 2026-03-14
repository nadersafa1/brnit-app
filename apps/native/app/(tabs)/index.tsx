import { Ionicons } from '@expo/vector-icons'
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet'
import dayjs from 'dayjs'
import { useCallback, useMemo, useRef, useState } from 'react'
import { Alert, Pressable, ScrollView, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BottomNav } from '@/components/bottom-nav'
import { CalorieRing } from '@/components/calorie-ring'
import { CalendarStrip } from '@/components/calendar-strip'
import { MacroBar } from '@/components/macro-bar'
import { MealCard } from '@/components/meal-card'
import { Button, Spinner, Text } from '@/components/ui'
import { useCurrentDietPlan } from '@/hooks/use-current-diet-plan'
import { useLogMealConsumption } from '@/hooks/use-log-meal-consumption'
import { useMealItemAlternatives } from '@/hooks/use-meal-item-alternatives'
import { useSetMealItemOverride } from '@/hooks/use-set-meal-item-override'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import type { CurrentDietPlanMeal, CurrentDietPlanMealItem } from '@/lib/api/member-types'
import type { SelectedMeal, SelectedMealItemForDetails } from '@/store/meal-actions-store'
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
  const detailsSheetRef = useRef<BottomSheet>(null)
  const { data: session } = authClient.useSession()
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedMealItemForDetails, setSelectedMealItemForDetails] = useState<SelectedMealItemForDetails | null>(null)

  const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
  const {
    data: dietPlanData,
    isLoading,
    error,
  } = useCurrentDietPlan({
    from: dateStr,
    to: dateStr,
  })

  const logConsumption = useLogMealConsumption()
  const assignmentId = dietPlanData?.data?.assignment?.id ?? null

  const meals = useMemo(() => getMealsForDate(dietPlanData, dateStr), [dietPlanData, dateStr])

  const {
    data: alternativesData,
    isLoading: alternativesLoading,
    isError: alternativesError,
  } = useMealItemAlternatives({
    assignmentId: assignmentId ?? '',
    dietPlanMealId: selectedMealItemForDetails?.meal.dietPlanMealId ?? '',
    mealItemId: selectedMealItemForDetails?.item.mealItemId ?? '',
    date: dateStr || undefined,
    enabled: showAlternatives && !!selectedMealItemForDetails && !!assignmentId,
  })
  const setOverride = useSetMealItemOverride()

  const handleCloseMealDetails = useCallback(() => {
    detailsSheetRef.current?.close()
    setShowAlternatives(false)
    setSelectedMealItemForDetails(null)
  }, [])

  const renderDetailsBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    []
  )

  const handleShowAlternatives = useCallback(() => {
    setShowAlternatives(true)
    detailsSheetRef.current?.snapToIndex(2)
  }, [])

  const handleSetSubstitute = useCallback(
    async (alt: FoodItemAlternative) => {
      if (!selectedMealItemForDetails || !assignmentId) return
      try {
        await setOverride.mutateAsync({
          assignmentId,
          dietPlanMealId: selectedMealItemForDetails.meal.dietPlanMealId,
          mealItemId: selectedMealItemForDetails.item.mealItemId,
          body: {
            foodItemId: alt.foodItemId,
            quantity: alt.suggestedQuantityGrams,
            date: dateStr,
          },
        })
        handleCloseMealDetails()
      } catch {
        // Error handled by mutation
      }
    },
    [selectedMealItemForDetails, assignmentId, dateStr, setOverride, handleCloseMealDetails]
  )

  const handleMealItemPress = useCallback((item: CurrentDietPlanMealItem, meal: SelectedMeal) => {
    setSelectedMealItemForDetails({ item, meal })
    detailsSheetRef.current?.snapToIndex(1)
  }, [])

  const handleMarkConsumed = useCallback(
    (meal: CurrentDietPlanMeal) => {
      if (assignmentId == null) {
        Alert.alert('Cannot mark as done', 'No diet plan assignment for this date.')
        return
      }
      logConsumption.mutate(
        {
          dietPlanAssignmentId: assignmentId,
          dietPlanMealId: meal.dietPlanMealId,
          consumedAt: new Date().toISOString(),
          usePlannedItems: true,
        },
        {
          onError: (err) => {
            Alert.alert('Failed to mark meal as done', err instanceof Error ? err.message : 'Please try again.')
          },
        }
      )
    },
    [assignmentId, logConsumption]
  )

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
              consumed={meal.consumed}
              onMarkConsumed={assignmentId ? () => handleMarkConsumed(meal) : undefined}
              meal={{ dietPlanMealId: meal.dietPlanMealId }}
              onMealItemPress={handleMealItemPress}
            />
          ))}
      </ScrollView>

      <BottomSheet
        ref={detailsSheetRef}
        index={-1}
        snapPoints={['50%', '70%', '80%']}
        enablePanDownToClose
        backdropComponent={renderDetailsBackdrop}
        onClose={handleCloseMealDetails}
        backgroundStyle={{ backgroundColor: colors.appBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.detailsSheetContent} keyboardShouldPersistTaps='handled'>
          {selectedMealItemForDetails && (
            <>
              <Text size='lg' weight='bold' style={styles.detailsSheetTitle}>
                {selectedMealItemForDetails.item.foodName}
              </Text>
              <Text size='sm' muted style={styles.detailsSheetQuantity}>
                Quantity: {selectedMealItemForDetails.item.quantity}
              </Text>
              {selectedMealItemForDetails.item.isOverridden === true &&
                selectedMealItemForDetails.item.originalFoodName != null && (
                  <Text size='xs' muted style={styles.detailsSheetOverride}>
                    Replaced: {selectedMealItemForDetails.item.originalFoodName}
                    {typeof selectedMealItemForDetails.item.originalQuantity === 'number'
                      ? ` (${selectedMealItemForDetails.item.originalQuantity})`
                      : ''}
                  </Text>
                )}
              <View style={styles.detailsSheetActions}>
                <Button onPress={handleShowAlternatives} variant='soft' style={styles.detailsSheetActionButton}>
                  Show alternatives
                </Button>
              </View>
              {showAlternatives && (
                <View style={styles.alternativesSection}>
                  <Text size='base' weight='semibold' style={styles.alternativesSectionTitle}>
                    Alternatives for {selectedMealItemForDetails.item.foodName}
                  </Text>
                  {alternativesLoading && (
                    <View style={styles.alternativesCentered}>
                      <Spinner size='lg' />
                      <Text muted style={styles.alternativesLoadingText}>
                        Finding alternatives...
                      </Text>
                    </View>
                  )}
                  {!alternativesLoading && alternativesError && (
                    <View style={styles.alternativesCentered}>
                      <Text muted>Failed to load alternatives. Please try again.</Text>
                    </View>
                  )}
                  {!alternativesLoading && !alternativesError && (alternativesData?.data ?? []).length === 0 && (
                    <View style={styles.alternativesCentered}>
                      <Text muted>No alternatives found with similar nutrition.</Text>
                    </View>
                  )}
                  {!alternativesLoading &&
                    !alternativesError &&
                    (alternativesData?.data ?? []).map(alt => (
                      <View key={alt.foodItemId} style={[styles.alternativeRow, { backgroundColor: colors.card }]}>
                        <View style={styles.alternativeRowInfo}>
                          <Text size='base' weight='semibold' numberOfLines={1}>
                            {alt.name}
                          </Text>
                          <Text size='sm' muted>
                            {alt.suggestedQuantityGrams}g · {alt.calories} kcal
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleSetSubstitute(alt)}
                          disabled={setOverride.isPending}
                          style={({ pressed }) => [
                            styles.alternativeUseButton,
                            { backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 },
                          ]}
                        >
                          <Text size='xs' weight='semibold' style={{ color: colors.white }}>
                            Use
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                </View>
              )}
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

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
  detailsSheetContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[6],
  },
  detailsSheetTitle: {
    marginBottom: spacing[1],
  },
  detailsSheetQuantity: {
    marginBottom: spacing[1],
  },
  detailsSheetOverride: {
    marginBottom: spacing[4],
  },
  detailsSheetActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  detailsSheetActionButton: {
    flex: 1,
  },
  alternativesSection: {
    marginTop: spacing[4],
  },
  alternativesSectionTitle: {
    marginBottom: spacing[3],
  },
  alternativesCentered: {
    alignItems: 'center',
    paddingVertical: spacing[8],
  },
  alternativesLoadingText: {
    marginTop: spacing[3],
  },
  alternativeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.sm,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  alternativeRowInfo: {
    flex: 1,
  },
  alternativeUseButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.sm,
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
