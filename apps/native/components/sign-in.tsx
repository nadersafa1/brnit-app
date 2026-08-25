import { useState } from 'react'
import { View, StyleSheet } from 'react-native'

import { authClient } from '@/lib/auth-client'
import { PasswordInput } from "@/components/password-input";
import { TextInput } from "@/components/text-input";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Surface } from "@/components/ui/surface";
import { Text } from "@/components/ui/text";
import { showError, showSuccess } from '@/lib/feedback'
import { spacing } from '@/theme/spacing'

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    setIsLoading(true)
    setError(null)

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onError(error) {
          const message = error.error?.message || 'Failed to sign in'
          setError(message)
          showError(message)
          setIsLoading(false)
        },
        onSuccess() {
          setEmail('')
          setPassword('')
          showSuccess('Signed in')
        },
        onFinished() {
          setIsLoading(false)
        },
      }
    )
  }

  return (
    <Surface variant="secondary" padding={4} radius="sm">
      <Text weight="medium" style={styles.title}>
        Sign In
      </Text>

      <View style={styles.errorContainer}>
        <FieldError error={error ?? undefined} isInvalid={!!error} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text size="sm" weight="medium">
            Email
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="email@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.field}>
          <Text size="sm" weight="medium">
            Password
          </Text>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button onPress={handleLogin} loading={isLoading} disabled={isLoading}>
            Sign In
          </Button>
        </View>
      </View>
    </Surface>
  )
}

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing[4],
  },
  errorContainer: {
    marginBottom: spacing[3],
  },
  form: {
    gap: spacing[3],
  },
  field: {
    gap: spacing[1],
  },
  buttonContainer: {
    marginTop: spacing[1],
  },
})

export { SignIn }
