import { Button, FieldError, Spinner, Surface } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { PasswordInput, TextInput } from "@/components";

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Surface variant="secondary" className="p-4 rounded-lg">
      <Text className="text-foreground font-medium mb-4">Sign In</Text>

      <FieldError isInvalid={!!error} className="mb-3">
        {error}
      </FieldError>

      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-foreground text-sm font-medium">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View className="gap-1">
          <Text className="text-foreground text-sm font-medium">Password</Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
        </View>

        <Button onPress={handleLogin} isDisabled={isLoading} className="mt-1">
          {isLoading ? <Spinner size="sm" color="default" /> : <Button.Label>Sign In</Button.Label>}
        </Button>
      </View>
    </Surface>
  );
}

export { SignIn };
