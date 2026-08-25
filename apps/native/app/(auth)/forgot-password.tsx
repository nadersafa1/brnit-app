import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect } from 'expo-router'
import { useState } from 'react'
import { ScrollView, TouchableOpacity, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthSuccessScreen } from "@/components/auth/auth-success-screen";
import { TextInput } from "@/components/text-input";
import { PrimaryButton } from "@/components/ui/primary-button";
import { FieldError } from "@/components/ui/field-error";
import { Text } from "@/components/ui/text";
import { showError, showSuccess } from '@/lib/feedback'
import { DEEP_LINKS } from '@/constants/deep-links'
import { authClient } from '@/lib/auth-client'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import { radii } from '@/theme/radii'

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const elevation = useShadows()
  const { data: session, isPending } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (isPending) {
    return null
  }

  if (session?.user) {
    return <Redirect href="/(tabs)" />
  }

  async function handleSendResetLink() {
    if (!email.trim()) {
      const message = 'Please enter your email'
      setError(message)
      showError(message)
      return
    }
    setIsLoading(true)
    setError(null)

    const { error: err } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: DEEP_LINKS.resetPassword,
    })

    setIsLoading(false)
    if (err) {
      const message = err.message || 'Failed to send reset link'
      setError(message)
      showError(message)
      return
    }
    showSuccess('Reset link sent', 'Check your email')
    setSent(true)
  }

  if (sent) {
    return (
      <AuthSuccessScreen
        icon="mail-open-outline"
        title="Check your email"
        description="If an account exists for that email, we've sent a link to reset your password."
        backHref="/(auth)/login"
        backLabel="Back to sign in"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          justifyContent: 'center',
        }}
      />
    )
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
          <Ionicons name="key-outline" size={48} color={colors.white} />
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}>
        <Text size="2xl" weight="bold" style={styles.title}>
          Forgot password
        </Text>
        <Text size="sm" muted style={styles.subtitle}>
          Enter your email and we'll send you a link to reset your password.
        </Text>

        <View style={styles.errorContainer}>
          <FieldError error={error ?? undefined} isInvalid={!!error} />
        </View>

        <View style={styles.form}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <View style={styles.buttonContainer}>
            <PrimaryButton onPress={handleSendResetLink} isLoading={isLoading}>
              Send reset link
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
})
