import { Text, View } from "react-native";

interface MacroBarProps {
  label: string;
  current: number;
  goal: number;
  color: "accent" | "info" | "success";
  unit?: string;
}

const colorMap = {
  accent: "bg-accent",
  info: "bg-info",
  success: "bg-success",
};

export function MacroBar({ label, current, goal, color, unit = "g" }: MacroBarProps) {
  const progress = Math.min(current / goal, 1);

  return (
    <View className="flex-1">
      <View className="flex-row justify-between mb-1">
        <Text className="text-xs font-semibold text-subtle">{label}</Text>
        <Text className="text-xs font-medium text-muted">
          {current}/{goal}{unit}
        </Text>
      </View>
      <View className="h-2 rounded-full overflow-hidden bg-border">
        <View
          className={`h-full rounded-full ${colorMap[color]}`}
          style={{ width: `${progress * 100}%` }}
        />
      </View>
    </View>
  );
}
