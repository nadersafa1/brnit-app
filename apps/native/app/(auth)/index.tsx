import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SignIn } from "@/components/sign-in";
import { SignUp } from "@/components/sign-up";
import { authClient } from "@/lib/auth-client";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { data: session, isPending } = authClient.useSession();

  // Show loading while checking auth
  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-app-bg">
        <ActivityIndicator size="large" color="#FD6E20" />
      </View>
    );
  }

  // Redirect to tabs if already signed in
  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View
      className="flex-1 bg-app-bg px-6"
      style={{ paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }}
    >
      {/* Decorative Corner Blob */}
      <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-pastel-purple" />

      <View className="mb-10">
        <Text className="text-4xl font-bold text-ink mb-2">Welcome to</Text>
        <Text className="text-4xl font-bold text-accent">Burn</Text>
        <Text className="text-base text-muted mt-3">
          Track your calories and reach your fitness goals
        </Text>
      </View>

      <SignIn />
      <SignUp />
    </View>
  );
}
