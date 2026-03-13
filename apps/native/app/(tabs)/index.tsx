import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { CalorieRing } from "@/components/calorie-ring";
import { CalendarStrip } from "@/components/calendar-strip";
import { MacroBar } from "@/components/macro-bar";
import { MealCard } from "@/components/meal-card";
import { useCurrentDietPlan } from "@/hooks/use-current-diet-plan";
import { authClient } from "@/lib/auth-client";
import type { CurrentDietPlanMeal } from "@/lib/api/member-types";

const MEAL_TYPE_ICONS: Record<string, "sunny-outline" | "partly-sunny-outline" | "cafe-outline" | "moon-outline"> = {
  breakfast: "sunny-outline",
  lunch: "partly-sunny-outline",
  snack: "cafe-outline",
  dinner: "moon-outline",
};

const caloriesGoal = 2000;
const macros = {
  protein: { current: 85, goal: 120 },
  carbs: { current: 145, goal: 200 },
  fat: { current: 48, goal: 65 },
};

function formatMealTime(mealType: string): string {
  const times: Record<string, string> = {
    breakfast: "8:00 AM",
    lunch: "12:30 PM",
    snack: "3:30 PM",
    dinner: "7:00 PM",
  };
  return times[mealType.toLowerCase()] ?? "12:00 PM";
}

function getMealsForDate(
  data: ReturnType<typeof useCurrentDietPlan>["data"],
  dateStr: string
): CurrentDietPlanMeal[] {
  if (!data?.data) return [];
  const day = data.data.days.find((d) => d.date === dateStr);
  return day?.meals ?? [];
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateStr = dayjs(selectedDate).format("YYYY-MM-DD");
  const { data: dietPlanData, isLoading, error } = useCurrentDietPlan({
    from: dateStr,
    to: dateStr,
  });

  const meals = useMemo(
    () => getMealsForDate(dietPlanData, dateStr),
    [dietPlanData, dateStr]
  );

  const caloriesConsumed = 0;
  const remainingCalories = caloriesGoal - caloriesConsumed;

  const userName = session?.user?.name?.split(" ")[0] || "there";
  const isToday = dayjs(selectedDate).isSame(dayjs(), "day");

  return (
    <View className="flex-1 bg-app-bg">
      {/* Decorative Corner Blob */}
      <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-pastel-purple" />

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 96,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full mr-3 bg-accent items-center justify-center">
              <Text className="text-lg font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text className="text-sm font-medium text-muted">Good morning 👋</Text>
              <Text className="text-lg font-bold text-ink">{userName}</Text>
            </View>
          </View>
          <Pressable className="w-11 h-11 rounded-full items-center justify-center bg-card shadow-sm">
            <Ionicons name="notifications-outline" size={20} color="#010409" />
          </Pressable>
        </View>

        {/* Calendar Strip */}
        <CalendarStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />

        {/* Main Calorie Card */}
        <View className="rounded-xl p-5 mb-4 bg-card shadow-md">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-ink">
              {isToday ? "Today's Progress" : dayjs(selectedDate).format("MMMM D")}
            </Text>
            <View className="px-3 py-1.5 rounded-full flex-row items-center bg-surface-alt">
              <Text className="text-xs font-semibold text-subtle">This Week</Text>
              <Ionicons name="chevron-down" size={14} color="#6B6B6B" style={{ marginLeft: 4 }} />
            </View>
          </View>

          {/* Calorie Ring */}
          <View className="items-center mb-5">
            <CalorieRing consumed={caloriesConsumed} goal={caloriesGoal} />
          </View>

          {/* Remaining calories badge */}
          <View className="items-center mb-5">
            <View
              className="px-4 py-2 rounded-full"
              style={{ backgroundColor: "rgba(53, 196, 139, 0.15)" }}
            >
              <Text className="text-sm font-semibold text-success">
                {remainingCalories} kcal remaining
              </Text>
            </View>
          </View>

          {/* Macros */}
          <View className="flex-row gap-4">
            <MacroBar
              label="Protein"
              current={macros.protein.current}
              goal={macros.protein.goal}
              color="accent"
            />
            <MacroBar
              label="Carbs"
              current={macros.carbs.current}
              goal={macros.carbs.goal}
              color="info"
            />
            <MacroBar
              label="Fat"
              current={macros.fat.current}
              goal={macros.fat.goal}
              color="success"
            />
          </View>
        </View>

        {/* Meals Section */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-ink">
            {isToday ? "Today's Meals" : dayjs(selectedDate).format("MMMM D") + " Meals"}
          </Text>
          <Pressable className="flex-row items-center">
            <Text className="text-sm font-semibold text-accent">Add Meal</Text>
            <View className="w-6 h-6 rounded-full items-center justify-center ml-2 bg-accent">
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" />
          </View>
        )}

        {/* Error State */}
        {error && (
          <View className="py-8 px-4 items-center bg-card rounded-xl">
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
            <Text className="text-sm text-muted mt-2 text-center">
              {error.message}
            </Text>
          </View>
        )}

        {/* No Diet Plan State */}
        {!isLoading && !error && meals.length === 0 && (
          <View className="py-8 px-4 items-center bg-card rounded-xl">
            <Ionicons name="restaurant-outline" size={32} color="#6B6B6B" />
            <Text className="text-base font-semibold text-ink mt-2">No meals planned</Text>
            <Text className="text-sm text-muted mt-1 text-center">
              You don't have a diet plan assigned for this date yet.
            </Text>
          </View>
        )}

        {/* Meal Cards */}
        {!isLoading &&
          !error &&
          meals.map((meal) => (
            <MealCard
              key={meal.dietPlanMealId}
              title={meal.mealName}
              calories={0}
              time={formatMealTime(meal.mealType)}
              icon={MEAL_TYPE_ICONS[meal.mealType.toLowerCase()] ?? "restaurant-outline"}
              items={meal.mealItems.map((item) => item.foodName)}
            />
          ))}
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab="home" />
    </View>
  );
}
