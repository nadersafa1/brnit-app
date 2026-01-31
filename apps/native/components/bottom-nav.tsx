import { Ionicons } from "@expo/vector-icons";
import { useRouter, useSegments } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabName = "home" | "search" | "stats" | "profile";

interface NavItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

function NavItem({ icon, label, isActive, onPress }: NavItemProps) {
  if (isActive) {
    return (
      <View className="flex-row items-center px-4 h-10 rounded-full bg-accent">
        <Ionicons name={icon} size={20} color="#FFFFFF" />
        <Text className="text-xs font-semibold text-white ml-2">{label}</Text>
      </View>
    );
  }

  return (
    <Pressable className="px-4 py-2" onPress={onPress}>
      <Ionicons name={icon} size={22} color="#FFFFFF" />
    </Pressable>
  );
}

interface BottomNavProps {
  activeTab?: TabName;
}

export function BottomNav({ activeTab }: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const segments = useSegments();

  // Determine active tab from route if not provided
  const currentTab = activeTab || (segments[1] as TabName) || "home";

  const navigate = (tab: TabName) => {
    if (tab === currentTab) return;
    
    const route = tab === "home" ? "/(tabs)" : `/(tabs)/${tab}`;
    router.push(route as any);
  };

  return (
    <View
      className="absolute left-4 right-4 rounded-full flex-row items-center justify-around p-2 bg-nav-pill shadow-md"
      style={{ bottom: insets.bottom + 16 }}
    >
      <NavItem
        icon="home"
        label="Home"
        isActive={currentTab === "home"}
        onPress={() => navigate("home")}
      />
      <NavItem
        icon="search-outline"
        label="Search"
        isActive={currentTab === "search"}
        onPress={() => navigate("search")}
      />
      <NavItem
        icon="bar-chart-outline"
        label="Stats"
        isActive={currentTab === "stats"}
        onPress={() => navigate("stats")}
      />
      <NavItem
        icon="person-outline"
        label="Profile"
        isActive={currentTab === "profile"}
        onPress={() => navigate("profile")}
      />
    </View>
  );
}
