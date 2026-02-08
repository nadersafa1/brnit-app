import { ErrorView } from "heroui-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, Redirect } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthSuccessScreen, PasswordInput, PrimaryButton, TextInput } from "@/components";
import { DEEP_LINKS } from "@/constants/deep-links";
import { authClient } from "@/lib/auth-client";

interface PasswordRequirement {
  label: string;
  met: boolean;
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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

  // Password requirements validation
  const passwordRequirements: PasswordRequirement[] = [
    {
      label: "Minimum 8 characters",
      met: password.length >= 8,
    },
    {
      label: "One number required",
      met: /\d/.test(password),
    },
    {
      label: "No spaces allowed",
      met: !/\s/.test(password),
    },
    {
      label: "Add a symbol (e.g., @, #, !)",
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  async function handleSignUp() {
    if (!allRequirementsMet) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    await authClient.signUp.email(
      {
        name,
        email,
        password,
        callbackURL: DEEP_LINKS.root,
      },
      {
        onError(error) {
          setError(error.error?.message || "Failed to sign up");
          setIsLoading(false);
        },
        onSuccess() {
          setName("");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setSent(true);
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

  if (sent) {
    return (
      <AuthSuccessScreen
        icon="mail-open-outline"
        title="Check your email"
        description="We've sent a verification link to your email."
        backHref="/(auth)/login"
        backLabel="Back to sign in"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
        }}
      />
    );
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
          <Text className="text-ink text-2xl font-bold mb-2">Create Account</Text>
          <Text className="text-muted text-sm mb-6">
            Set a strong password to keep your account safe.
          </Text>

          <ErrorView isInvalid={!!error} className="mb-4">
            {error}
          </ErrorView>

          <View className="gap-4">
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Name"
              icon="person-outline"
              autoCapitalize="words"
              autoComplete="name"
            />

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
              placeholder="New Password"
              autoComplete="password-new"
            />

            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              autoComplete="password-new"
            />

            {/* Password Requirements */}
            {password.length > 0 && (
              <View className="gap-2 mt-2">
                {passwordRequirements.map((requirement, index) => (
                  <View key={index} className="flex-row items-center gap-2">
                    <Ionicons
                      name={requirement.met ? "checkmark-circle" : "close-circle"}
                      size={16}
                      color={requirement.met ? "#35C48B" : "#FF4D4F"}
                    />
                    <Text
                      className="text-xs"
                      style={{ color: requirement.met ? "#35C48B" : "#FF4D4F" }}
                    >
                      {requirement.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

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

            {/* Primary Sign Up Button */}
            <View className="mt-2">
              <PrimaryButton
                onPress={handleSignUp}
                isLoading={isLoading}
                isDisabled={!allRequirementsMet || !passwordsMatch}
              >
                Create Account
              </PrimaryButton>
            </View>

            {/* Navigation Link */}
            <View className="flex-row justify-center items-center mt-4">
              <Text className="text-muted text-sm">Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-accent font-medium text-sm">Sign in</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
