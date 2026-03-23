import { Tabs } from "expo-router";
import { useSyncOnboardingAnswers } from "@/hooks/use-sync-onboarding-answers";

export default function TabLayout() {
  useSyncOnboardingAnswers();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          display: "none",
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
