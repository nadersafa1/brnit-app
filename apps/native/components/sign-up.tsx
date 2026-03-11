import { Button, FieldError, Spinner, Surface } from "heroui-native";
import { useState } from "react";
import { Text, View } from "react-native";

import { authClient } from "@/lib/auth-client";
import { PasswordInput, TextInput } from "@/components";

function signUpHandler({
  name,
  email,
  password,
  setError,
  setIsLoading,
  setName,
  setEmail,
  setPassword,
}: {
  name: string;
  email: string;
  password: string;
  setError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setPassword: (password: string) => void;
}) {
  setIsLoading(true);
  setError(null);

  authClient.signUp.email(
    {
      name,
      email,
      password,
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
      },
      onFinished() {
        setIsLoading(false);
      },
    },
  );
}

export function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handlePress() {
    signUpHandler({
      name,
      email,
      password,
      setError,
      setIsLoading,
      setName,
      setEmail,
      setPassword,
    });
  }

  return (
    <Surface variant="secondary" className="p-4 rounded-lg">
      <Text className="text-foreground font-medium mb-4">Create Account</Text>

      <FieldError isInvalid={!!error} className="mb-3">
        {error}
      </FieldError>

      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-foreground text-sm font-medium">Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
          />
        </View>

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

        <Button onPress={handlePress} isDisabled={isLoading} className="mt-1">
          {isLoading ? (
            <Spinner size="sm" color="default" />
          ) : (
            <Button.Label>Create Account</Button.Label>
          )}
        </Button>
      </View>
    </Surface>
  );
}
