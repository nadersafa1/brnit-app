import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PasswordInput, PrimaryButton, TextInput } from '@/components'
import { FieldError, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { invitationId } = useLocalSearchParams<{ invitationId?: string }>()
  const { data: session, isPending } = authClient.useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isPending) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.appBg }]}>
        <ActivityIndicator size='large' color={colors.accent} />
      </View>
    )
  }

  if (session?.user) {
    if (invitationId) {
      return <Redirect href={{ pathname: '/accept-invitation', params: { invitationId } }} />
    }
    return <Redirect href='/(tabs)' />
  }

  async function handleLogin() {
    setIsLoading(true)
    setError(null)

    await authClient.signIn.email(
      { email, password },
      {
        onError(error) {
          setError(error.error?.message || 'Failed to sign in')
          setIsLoading(false)
        },
        onSuccess() {
          setEmail('')
          setPassword('')
        },
        onFinished() {
          setIsLoading(false)
        },
      }
    )
  }

  async function handleGoogleLogin() {
    setIsLoading(true)
    setError(null)
    await authClient.signIn.social(
      { provider: 'google', callbackURL: '/(tabs)' },
      {
        onError(err) {
          setError(err.error?.message || 'Google sign-in failed')
          setIsLoading(false)
        },
        onSuccess() {
          setError(null)
        },
        onFinished() {
          setIsLoading(false)
        },
      }
    )
  }

  function handleAppleLogin() {
    console.log('Apple login pressed')
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.appBg }]}
      contentContainerStyle={[
        styles.contentContainer,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.mainContent}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.pastelPurple }]}>
            <Ionicons name='shield-checkmark' size={48} color={colors.white} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }, shadows.lg]}>
          <Text size='2xl' weight='bold' style={styles.title}>
            Sign In
          </Text>
          <Text size='sm' muted style={styles.subtitle}>
            Welcome back! Sign in to continue your fitness journey.
          </Text>

          <View style={styles.errorContainer}>
            <FieldError error={error ?? undefined} isInvalid={!!error} />
          </View>

          <View style={styles.form}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder='Email'
              icon='mail-outline'
              keyboardType='email-address'
              autoCapitalize='none'
              autoComplete='email'
            />

            <PasswordInput value={password} onChangeText={setPassword} placeholder='Password' autoComplete='password' />

            <View style={styles.forgotContainer}>
              <Link href='/(auth)/forgot-password' asChild>
                <TouchableOpacity>
                  <Text size='sm' weight='medium' accent>
                    Forgot password?
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity
                onPress={handleGoogleLogin}
                disabled={isLoading}
                style={[styles.socialButton, { backgroundColor: colors.card }, shadows.md]}
              >
                <Ionicons name='logo-google' size={20} color={colors.subtle} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAppleLogin}
                style={[styles.socialButton, { backgroundColor: colors.card }, shadows.md]}
              >
                <Ionicons name='logo-apple' size={20} color={colors.subtle} />
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <PrimaryButton onPress={handleLogin} isLoading={isLoading}>
                Sign In
              </PrimaryButton>
            </View>

            <View style={styles.linkContainer}>
              <Text size='sm' muted>
                Don't have an account?{' '}
              </Text>
              <Link href='/(auth)/sign-up' asChild>
                <TouchableOpacity>
                  <Text size='sm' weight='medium' accent>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing[6],
    minHeight: '100%',
  },
  mainContent: {
    flex: 1,
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
  forgotContainer: {
    alignItems: 'flex-end',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  socialButton: {
    flex: 1,
    height: 44,
    borderRadius: radii.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
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
