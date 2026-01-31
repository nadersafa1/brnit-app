import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface DayPillProps {
  day: string;
  date: number;
  isSelected?: boolean;
  isCompleted?: boolean;
}

export function DayPill({ day, date, isSelected, isCompleted }: DayPillProps) {
  return (
    <Pressable className="items-center mx-1">
      <Text
        className={`text-xs font-medium mb-1 ${isSelected ? "text-accent" : "text-muted"}`}
      >
        {day}
      </Text>
      <View
        className={`w-9 h-9 rounded-full items-center justify-center ${
          isSelected ? "bg-accent" : "bg-surface-alt"
        }`}
      >
        {isCompleted && !isSelected ? (
          <Ionicons name="checkmark" size={16} color="#35C48B" />
        ) : (
          <Text
            className={`text-sm font-semibold ${
              isSelected ? "text-white" : "text-subtle"
            }`}
          >
            {date}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
