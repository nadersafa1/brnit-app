import { ErrorView } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PasswordInput, PrimaryButton } from "@/components";
import { authClient } from "@/lib/auth-client";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const rawToken = useLocalSearchParams<{ token?: string | string[] }>().token;
  const token = typeof rawToken === "string" ? rawToken : Array.isArray(rawToken) ? rawToken[0] : undefined;
  const { data: session, isPending } = authClient.useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending) {
    return null;
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />;
  }

  if (!token) {
    return (
      <ScrollView
        className="flex-1 bg-app-bg"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
          minHeight: "100%",
          justifyContent: "center",
        }}
      >
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
          <Text className="text-ink text-2xl font-bold mb-2">Invalid reset link</Text>
          <Text className="text-muted text-sm mb-6">
            This reset link is invalid or has expired. Please request a new one.
          </Text>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text className="text-accent font-medium text-sm text-center">Request new link</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    );
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { error: err } = await authClient.resetPassword({
      newPassword,
      token,
    });

    setIsLoading(false);
    if (err) {
      if (err.code === "INVALID_TOKEN") {
        setError("Reset link is invalid or expired");
      } else {
        setError(err.message || "Failed to reset password");
      }
      return;
    }
    // Success: redirect to login
    const { router } = await import("expo-router");
    router.replace("/(auth)/login");
  }

  return (
    <ScrollView
      className="flex-1 bg-app-bg"
      contentContainerStyle={{
        paddingTop: insets.top + 20,
        paddingBottom: insets.bottom + 20,
        paddingHorizontal: 24,
        minHeight: "100%",
        justifyContent: "center",
      }}
    >
      <View className="items-center mb-8">
        <View className="w-24 h-24 rounded-full bg-pastel-purple items-center justify-center">
          <Ionicons name="lock-open-outline" size={48} color="#FFFFFF" />
        </View>
      </View>
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
        <Text className="text-ink text-2xl font-bold mb-2">Set new password</Text>
        <Text className="text-muted text-sm mb-6">Enter your new password below.</Text>

        <ErrorView isInvalid={!!error} className="mb-4">
          {error}
        </ErrorView>

        <View className="gap-4">
          <PasswordInput
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            autoComplete="new-password"
          />

          <PasswordInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm password"
            autoComplete="new-password"
          />

          <PrimaryButton
            onPress={handleResetPassword}
            isLoading={isLoading}
            className="mt-2"
          >
            Reset password
          </PrimaryButton>

          <View className="flex-row justify-center items-center mt-4">
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text className="text-accent font-medium text-sm">Back to sign in</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
