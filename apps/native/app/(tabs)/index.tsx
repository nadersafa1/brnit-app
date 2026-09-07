import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
	Directions,
	Gesture,
	GestureDetector,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { CalendarStrip } from "@/components/calendar-strip";
import { HomeHeader } from "@/components/home-header";
import { HomeMealsSection } from "@/components/home-meals-section";
import { HomeProgressCard } from "@/components/home-progress-card";
import { MealItemDetailSheet } from "@/components/meal-item-detail-sheet/meal-item-detail-sheet";
import type { MealItemDetailPayload } from "@/components/meal-item-detail-sheet/types";
import { useConsumptionStreak } from "@/hooks/use-consumption-streak";
import { useCurrentDietPlan } from "@/hooks/use-current-diet-plan";
import { useDayProgress } from "@/hooks/use-day-progress";
import { useSurfaceQueryErrorToast } from "@/hooks/use-surface-query-error-toast";
import { useColors } from "@/hooks/use-theme-color";
import { authClient } from "@/lib/auth-client";
import { getMaxConsumptionPastDays } from "@/lib/consumption-date-window";
import {
	addLocalDays,
	isLocalToday,
	toLocalDateString,
} from "@/lib/date/calendar-date";
import { getDayForDate } from "@/lib/helpers/diet-plan";
import { radii } from "@/theme/radii";
import { spacing } from "@/theme/spacing";

export default function Home() {
	const insets = useSafeAreaInsets();
	const colors = useColors();
	const { data: session } = authClient.useSession();
	const [selectedDate, setSelectedDate] = useState(() => new Date());
	const [selectedMealItem, setSelectedMealItem] =
		useState<MealItemDetailPayload | null>(null);
	const maxConsumptionPastDays = getMaxConsumptionPastDays();

	const dateStr = toLocalDateString(selectedDate);
	const {
		data: dietPlanData,
		isPending: isDietPlanPending,
		error,
	} = useCurrentDietPlan({
		from: dateStr,
		to: dateStr,
	});

	useSurfaceQueryErrorToast(error);

	const day = useMemo(
		() => getDayForDate(dietPlanData, dateStr),
		[dietPlanData, dateStr]
	);
	const meals = day?.meals ?? [];
	const progress = useDayProgress(day, meals);
	const {
		data: streakData,
		isLoading: streakLoading,
		error: streakError,
	} = useConsumptionStreak();

	const userName = session?.user?.name?.split(" ")[0] || "there";
	const userImageUrl = session?.user?.image ?? undefined;
	const isToday = isLocalToday(selectedDate);

	const goToNextDay = useCallback(() => {
		setSelectedDate((prev) => addLocalDays(prev, 1));
	}, []);

	const goToPreviousDay = useCallback(() => {
		setSelectedDate((prev) => addLocalDays(prev, -1));
	}, []);

	const swipeLeft = Gesture.Fling()
		.direction(Directions.LEFT)
		.runOnJS(true)
		.onEnd(goToNextDay);
	const swipeRight = Gesture.Fling()
		.direction(Directions.RIGHT)
		.runOnJS(true)
		.onEnd(goToPreviousDay);
	const swipeGesture = Gesture.Simultaneous(swipeLeft, swipeRight);

	return (
		<View style={[styles.container, { backgroundColor: colors.appBg }]}>
			<View
				style={[styles.decorativeBlob, { backgroundColor: colors.decorative }]}
			/>

			<GestureDetector gesture={swipeGesture}>
				<ScrollView
					contentContainerStyle={[
						styles.contentContainer,
						{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 },
					]}
					showsVerticalScrollIndicator={false}
					style={styles.scrollView}
				>
					<HomeHeader userImageUrl={userImageUrl} userName={userName} />
					<CalendarStrip
						onDateSelect={setSelectedDate}
						selectedDate={selectedDate}
					/>
					<HomeProgressCard
						caloriesConsumed={progress.caloriesConsumed}
						caloriesGoal={progress.caloriesGoal}
						carbsConsumed={progress.carbsConsumed}
						carbsGoal={progress.carbsGoal}
						dietPlanLoading={isDietPlanPending}
						fatConsumed={progress.fatConsumed}
						fatGoal={progress.fatGoal}
						hasPlan={progress.hasPlan}
						isToday={isToday}
						proteinConsumed={progress.proteinConsumed}
						proteinGoal={progress.proteinGoal}
						remainingCalories={progress.remainingCalories}
						selectedDate={selectedDate}
						streak={streakData?.streak ?? 0}
						streakError={streakError}
						streakLoading={streakLoading}
					/>
					<HomeMealsSection
						assignmentEndDate={dietPlanData?.data?.assignment?.endDate}
						assignmentStartDate={dietPlanData?.data?.assignment?.startDate}
						dietPlanAssignmentId={dietPlanData?.data?.assignment?.id}
						error={error ?? null}
						isLoading={isDietPlanPending}
						maxPastDays={maxConsumptionPastDays}
						meals={meals}
						onMealItemPress={setSelectedMealItem}
						selectedDate={selectedDate}
					/>
				</ScrollView>
			</GestureDetector>

			<BottomNav activeTab="home" />
			<MealItemDetailSheet
				onClose={() => setSelectedMealItem(null)}
				payload={selectedMealItem}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	decorativeBlob: {
		position: "absolute",
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
});
