import { Ionicons } from "@expo/vector-icons";
import { Link, type Href } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { ComponentProps } from "react";

const CARD_STYLE = {
  shadowColor: "rgba(1, 4, 9, 0.12)",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 1,
  shadowRadius: 18,
  elevation: 8,
} as const;

export interface AuthSuccessScreenProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  backHref: Href;
  backLabel: string;
  contentContainerStyle?: ComponentProps<typeof ScrollView>["contentContainerStyle"];
}

export function AuthSuccessScreen({
  icon,
  title,
  description,
  backHref,
  backLabel,
  contentContainerStyle,
}: AuthSuccessScreenProps) {
  return (
    <ScrollView
      className="flex-1 bg-app-bg"
      contentContainerStyle={[
        {
          paddingHorizontal: 24,
          minHeight: "100%",
          justifyContent: "center",
        },
        contentContainerStyle,
      ]}
    >
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-pastel-purple items-center justify-center">
          <Ionicons name={icon} size={48} color="#FFFFFF" />
        </View>
      </View>
      <View className="bg-card rounded-lg p-6" style={CARD_STYLE}>
        <Text className="text-ink text-2xl font-bold mb-2">{title}</Text>
        <Text className="text-muted text-sm mb-6">{description}</Text>
        <Link href={backHref} asChild>
          <TouchableOpacity>
            <Text className="text-accent font-medium text-sm text-center">{backLabel}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </ScrollView>
  );
}
