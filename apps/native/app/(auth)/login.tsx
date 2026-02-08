import { ErrorView } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PasswordInput, PrimaryButton, TextInput } from "@/components";
import { authClient } from "@/lib/auth-client";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { data: session, isPending } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleLogin() {
    setIsLoading(true);
    setError(null);

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError(error) {
          setError(error.error?.message || "Failed to sign in");
          setIsLoading(false);
        },
        onSuccess() {
          setEmail("");
          setPassword("");
        },
        onFinished() {
          setIsLoading(false);
        },
      },
    );
  }

  async function handleGoogleLogin() {
    setIsLoading(true);
    setError(null);
    await authClient.signIn.social(
      {
        provider: "google",
        callbackURL: "/(tabs)",
      },
      {
        onError(err) {
          setError(err.error?.message || "Google sign-in failed");
          setIsLoading(false);
        },
        onSuccess() {
          setError(null);
        },
        onFinished() {
          setIsLoading(false);
        },
      }
    );
  }

  function handleAppleLogin() {
    console.log("Apple login pressed");
    // TODO: Implement Apple OAuth
  }

  return (
    <ScrollView
      className="flex-1 bg-app-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
        minHeight: "100%",
      }}
    >
      <View className="flex-1 justify-center">
        {/* Decorative Icon */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-pastel-purple items-center justify-center">
            <Ionicons name="shield-checkmark" size={48} color="#FFFFFF" />
          </View>
        </View>

        {/* Modal-like Card */}
        <View
          className="bg-card rounded-lg p-6"
          style={{
            shadowColor: "rgba(1, 4, 9, 0.12)",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 1,
            shadowRadius: 18,
            elevation: 8,
          }}
        >
          <Text className="text-ink text-2xl font-bold mb-2">Sign In</Text>
          <Text className="text-muted text-sm mb-6">
            Welcome back! Sign in to continue your fitness journey.
          </Text>

          <ErrorView isInvalid={!!error} className="mb-4">
            {error}
          </ErrorView>

          <View className="gap-4">
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              icon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              autoComplete="password"
            />

            <View className="items-end">
              <Link href="/(auth)/forgot-password" asChild>
                <TouchableOpacity>
                  <Text className="text-accent font-medium text-sm">Forgot password?</Text>
                </TouchableOpacity>
              </Link>
            </View>

            {/* Social Login Buttons */}
            <View className="flex-row gap-3 mt-2">
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={isLoading}
                className="bg-card rounded-full h-11 flex-1 flex-row items-center justify-center px-4"
                style={{
                  shadowColor: "rgba(1, 4, 9, 0.12)",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  elevation: 4,
                }}
              >
                <Ionicons name="logo-google" size={20} color="#3A3A3A" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAppleLogin}
                className="bg-card rounded-full h-11 flex-1 flex-row items-center justify-center px-4"
                style={{
                  shadowColor: "rgba(1, 4, 9, 0.12)",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 1,
                  shadowRadius: 18,
                  elevation: 4,
                }}
              >
                <Ionicons name="logo-apple" size={20} color="#3A3A3A" />
              </TouchableOpacity>
            </View>

            {/* Primary Sign In Button */}
            <View className="mt-2">
              <PrimaryButton onPress={handleLogin} isLoading={isLoading}>
                Sign In
              </PrimaryButton>
            </View>

            {/* Navigation Link */}
            <View className="flex-row justify-center items-center mt-4">
              <Text className="text-muted text-sm">Don't have an account? </Text>
              <Link href="/(auth)/sign-up" asChild>
                <TouchableOpacity>
                  <Text className="text-accent font-medium text-sm">Sign up</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
