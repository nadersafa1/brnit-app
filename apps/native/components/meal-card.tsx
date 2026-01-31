import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface MealCardProps {
  title: string;
  calories: number;
  time: string;
  icon: keyof typeof Ionicons.glyphMap;
  items: string[];
}

export function MealCard({ title, calories, time, icon, items }: MealCardProps) {
  return (
    <Pressable className="rounded-lg p-4 mb-3 bg-card shadow-sm active:scale-[0.98] active:opacity-95">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <View className="w-10 h-10 rounded-xl items-center justify-center mr-3 bg-surface-alt">
            <Ionicons name={icon} size={20} color="#FD6E20" />
          </View>
          <View>
            <Text className="text-base font-semibold text-ink">{title}</Text>
            <Text className="text-xs font-medium text-muted">{time}</Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <Text className="text-base font-bold text-accent">{calories}</Text>
          <Text className="text-xs font-medium text-muted ml-0.5">kcal</Text>
        </View>
      </View>
      <Text className="text-sm font-medium text-muted" numberOfLines={1}>
        {items.join(" • ")}
      </Text>
    </Pressable>
  );
}
