import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";
import { CalorieRing } from "@/components/calorie-ring";
import { DayPill } from "@/components/day-pill";
import { MacroBar } from "@/components/macro-bar";
import { MealCard } from "@/components/meal-card";
import { authClient } from "@/lib/auth-client";

// Sample data - in a real app this would come from state/API
const meals = [
  {
    title: "Breakfast",
    calories: 420,
    time: "8:30 AM",
    icon: "sunny-outline" as const,
    items: ["Oatmeal", "Banana", "Almond milk"],
  },
  {
    title: "Lunch",
    calories: 650,
    time: "12:45 PM",
    icon: "partly-sunny-outline" as const,
    items: ["Grilled chicken", "Quinoa", "Mixed greens"],
  },
  {
    title: "Snack",
    calories: 180,
    time: "3:30 PM",
    icon: "cafe-outline" as const,
    items: ["Greek yogurt", "Berries"],
  },
];

const weekDays = [
  { day: "Mon", date: 27, isCompleted: true },
  { day: "Tue", date: 28, isCompleted: true },
  { day: "Wed", date: 29, isCompleted: true },
  { day: "Thu", date: 30, isCompleted: false },
  { day: "Fri", date: 31, isSelected: true },
  { day: "Sat", date: 1, isCompleted: false },
  { day: "Sun", date: 2, isCompleted: false },
];

const caloriesConsumed = 1450;
const caloriesGoal = 2000;
const macros = {
  protein: { current: 85, goal: 120 },
  carbs: { current: 145, goal: 200 },
  fat: { current: 48, goal: 65 },
};

export default function Home() {
  const insets = useSafeAreaInsets();
  const { data: session } = authClient.useSession();
  const remainingCalories = caloriesGoal - caloriesConsumed;

  const userName = session?.user?.name?.split(" ")[0] || "there";

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

        {/* Week Calendar Strip */}
        <View className="flex-row justify-between mb-6 px-2">
          {weekDays.map((item, index) => (
            <DayPill key={index} {...item} />
          ))}
        </View>

        {/* Main Calorie Card */}
        <View className="rounded-xl p-5 mb-4 bg-card shadow-md">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-ink">Today&apos;s Progress</Text>
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
          <Text className="text-lg font-bold text-ink">Today&apos;s Meals</Text>
          <Pressable className="flex-row items-center">
            <Text className="text-sm font-semibold text-accent">Add Meal</Text>
            <View className="w-6 h-6 rounded-full items-center justify-center ml-2 bg-accent">
              <Ionicons name="add" size={16} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>

        {/* Meal Cards */}
        {meals.map((meal, index) => (
          <MealCard key={index} {...meal} />
        ))}
      </ScrollView>

      {/* Floating Bottom Navigation */}
      <BottomNav activeTab="home" />
    </View>
  );
}
