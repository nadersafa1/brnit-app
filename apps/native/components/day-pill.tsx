import dayjs from "dayjs";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

interface DayPillProps {
  day: string;
  date: Date;
  isSelected?: boolean;
  isCompleted?: boolean;
  onPress?: () => void;
}

export function DayPill({ day, date, isSelected, onPress }: DayPillProps) {
  const dateNumber = dayjs(date).date();

  return (
    <Pressable className="items-center" onPress={onPress} style={{ flex: 1 }}>
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
        <Text
          className={`text-sm font-semibold ${
            isSelected ? "text-white" : "text-subtle"
          }`}
        >
          {dateNumber}
        </Text>
      </View>
    </Pressable>
  );
}
