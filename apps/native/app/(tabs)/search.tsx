import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav } from "@/components/bottom-nav";

export default function Search() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-app-bg">
      {/* Decorative Corner Blob */}
      <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-pastel-purple" />

      <View
        className="flex-1 px-4"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 96 }}
      >
        <Text className="text-2xl font-bold text-ink mb-6">Search Foods</Text>

        {/* Search Input */}
        <View className="flex-row items-center bg-card rounded-full px-4 py-3 shadow-sm mb-6">
          <Ionicons name="search-outline" size={20} color="#6B6B6B" />
          <TextInput
            placeholder="Search for a food..."
            placeholderTextColor="#6B6B6B"
            className="flex-1 ml-3 text-base text-ink"
          />
        </View>

        {/* Quick Categories */}
        <Text className="text-lg font-bold text-ink mb-4">Quick Add</Text>
        <View className="flex-row flex-wrap gap-3">
          {["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks", "Desserts"].map((category) => (
            <Pressable
              key={category}
              className="bg-card px-4 py-3 rounded-full shadow-sm active:scale-95"
            >
              <Text className="text-sm font-semibold text-subtle">{category}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <BottomNav activeTab="search" />
    </View>
  );
}
