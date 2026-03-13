import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PasswordInput, PrimaryButton } from '@/components'
import { FieldError, Text } from '@/components/ui'
import { authClient } from '@/lib/auth-client'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const rawToken = useLocalSearchParams<{ token?: string | string[] }>().token
  const token = typeof rawToken === 'string' ? rawToken : Array.isArray(rawToken) ? rawToken[0] : undefined
  const { data: session, isPending } = authClient.useSession()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending) {
    return null
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />
  }

  if (!token) {
    return (
      <ScrollView
        style={[styles.scrollView, { backgroundColor: colors.appBg }]}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={[styles.card, { backgroundColor: colors.card }, shadows.lg]}>
          <Text size="2xl" weight="bold" style={styles.title}>
            Invalid reset link
          </Text>
          <Text size="sm" muted style={styles.subtitle}>
            This reset link is invalid or has expired. Please request a new one.
          </Text>
          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity>
              <Text size="sm" weight="medium" accent style={styles.linkText}>
                Request new link
              </Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    )
  }

  async function handleResetPassword() {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    setError(null)

    const { error: err } = await authClient.resetPassword({
      newPassword,
      token,
    })

    setIsLoading(false)
    if (err) {
      if (err.code === 'INVALID_TOKEN') {
        setError('Reset link is invalid or expired')
      } else {
        setError(err.message || 'Failed to reset password')
      }
      return
    }
    const { router } = await import('expo-router')
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.appBg }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.iconContainer}>
        <View style={[styles.iconCircle, { backgroundColor: colors.pastelPurple }]}>
          <Ionicons name="lock-open-outline" size={48} color={colors.white} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }, shadows.lg]}>
        <Text size="2xl" weight="bold" style={styles.title}>
          Set new password
        </Text>
        <Text size="sm" muted style={styles.subtitle}>
          Enter your new password below.
        </Text>

        <View style={styles.errorContainer}>
          <FieldError error={error ?? undefined} isInvalid={!!error} />
        </View>

        <View style={styles.form}>
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

          <View style={styles.buttonContainer}>
            <PrimaryButton onPress={handleResetPassword} isLoading={isLoading}>
              Reset password
            </PrimaryButton>
          </View>

          <View style={styles.linkContainer}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text size="sm" weight="medium" accent>
                  Back to sign in
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[6],
    minHeight: '100%',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing[8],
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: radii.sm,
    padding: spacing[6],
  },
  title: {
    marginBottom: spacing[2],
  },
  subtitle: {
    marginBottom: spacing[6],
  },
  errorContainer: {
    marginBottom: spacing[4],
  },
  form: {
    gap: spacing[4],
  },
  buttonContainer: {
    marginTop: spacing[2],
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing[4],
  },
  linkText: {
    textAlign: 'center',
  },
})
