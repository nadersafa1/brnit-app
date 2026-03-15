import { useState } from 'react'
import { View, StyleSheet } from 'react-native'

import { authClient } from '@/lib/auth-client'
import { PasswordInput, TextInput } from '@/components'
import { Button, Surface, FieldError, Text } from '@/components/ui'
import { showError, showSuccess } from '@/lib/feedback'
import { spacing } from '@/theme/spacing'

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
  name: string
  email: string
  password: string
  setError: (error: string | null) => void
  setIsLoading: (loading: boolean) => void
  setName: (name: string) => void
  setEmail: (email: string) => void
  setPassword: (password: string) => void
}) {
  setIsLoading(true)
  setError(null)

  authClient.signUp.email(
    {
      name,
      email,
      password,
    },
    {
      onError(error) {
        const message = error.error?.message || 'Failed to sign up'
        setError(message)
        showError(message)
        setIsLoading(false)
      },
      onSuccess() {
        setName('')
        setEmail('')
        setPassword('')
        showSuccess('Account created')
      },
      onFinished() {
        setIsLoading(false)
      },
    }
  )
}

export function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    })
  }

  return (
    <Surface variant="secondary" padding={4} radius="sm">
      <Text weight="medium" style={styles.title}>
        Create Account
      </Text>

      <View style={styles.errorContainer}>
        <FieldError error={error ?? undefined} isInvalid={!!error} />
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text size="sm" weight="medium">
            Name
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="John Doe"
            icon="person-outline"
          />
        </View>

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
          <Button onPress={handlePress} loading={isLoading} disabled={isLoading}>
            Create Account
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
