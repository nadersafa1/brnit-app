import "@/polyfills";
import "@/global.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Redirect, Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/query-client";

function AuthenticatedLayout() {
  const { data: session, isPending } = authClient.useSession();

  // Show nothing while checking auth status
  if (isPending) {
    return null;
  }

  // Redirect to auth if not logged in
  if (!session?.user) {
    return <Redirect href="/(auth)" />;
  }

  // Redirect to tabs if logged in
  return <Redirect href="/(tabs)" />;
}

function RootNavigator() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accept-invitation" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modal" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <HeroUINativeProvider>
              <RootNavigator />
            </HeroUINativeProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
