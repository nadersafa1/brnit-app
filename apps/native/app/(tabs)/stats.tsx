import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";

export default function Stats() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-app-bg">
      {/* Decorative Corner Blob */}
      <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-pastel-purple" />

      <View
        className="flex-1 px-4"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }}
      >
        <Text className="text-2xl font-bold text-ink mb-6">Statistics</Text>

        {/* Weekly Summary Card */}
        <View className="bg-card rounded-xl p-5 shadow-md mb-4">
          <Text className="text-lg font-bold text-ink mb-4">This Week</Text>
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-accent">12,450</Text>
              <Text className="text-xs text-muted">Calories</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-info">520g</Text>
              <Text className="text-xs text-muted">Carbs</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-success">340g</Text>
              <Text className="text-xs text-muted">Protein</Text>
            </View>
          </View>
        </View>

        {/* Streak Card */}
        <View className="bg-card rounded-xl p-5 shadow-md">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-ink">Current Streak</Text>
              <Text className="text-sm text-muted">Keep it going!</Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="flame" size={28} color="#FD6E20" />
              <Text className="text-3xl font-bold text-accent ml-2">7</Text>
            </View>
          </View>
        </View>
      </View>

      <BottomNav activeTab="stats" />
    </View>
  );
}
