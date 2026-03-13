import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthSuccessScreen, PasswordInput, PrimaryButton, TextInput } from '@/components'
import { FieldError, Text } from '@/components/ui'
import { DEEP_LINKS } from '@/constants/deep-links'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { radii } from '@/theme/radii'
import { shadows } from '@/theme/shadows'
import { spacing } from '@/theme/spacing'

interface PasswordRequirement {
  label: string
  met: boolean
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  if (isPending) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.appBg }]}>
        <ActivityIndicator size='large' color={colors.accent} />
      </View>
    )
  }

  if (session?.user) {
    return <Redirect href='/(tabs)' />
  }

  const passwordRequirements: PasswordRequirement[] = [
    { label: 'Minimum 8 characters', met: password.length >= 8 },
    { label: 'One number required', met: /\d/.test(password) },
    { label: 'No spaces allowed', met: !/\s/.test(password) },
    { label: 'Add a symbol (e.g., @, #, !)', met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every(req => req.met)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  async function handleSignUp() {
    if (!allRequirementsMet) {
      setError('Please meet all password requirements')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)

    await authClient.signUp.email(
      { name, email, password, callbackURL: DEEP_LINKS.root },
      {
        onError(error) {
          setError(error.error?.message || 'Failed to sign up')
          setIsLoading(false)
        },
        onSuccess() {
          setName('')
          setEmail('')
          setPassword('')
          setConfirmPassword('')
          setSent(true)
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

  if (sent) {
    return (
      <AuthSuccessScreen
        icon='mail-open-outline'
        title='Check your email'
        description="We've sent a verification link to your email."
        backHref='/(auth)/login'
        backLabel='Back to sign in'
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
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
      <View style={styles.mainContent}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.pastelPurple }]}>
            <Ionicons name='shield-checkmark' size={48} color={colors.white} />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card }, shadows.lg]}>
          <Text size='2xl' weight='bold' style={styles.title}>
            Create Account
          </Text>
          <Text size='sm' muted style={styles.subtitle}>
            Set a strong password to keep your account safe.
          </Text>

          <View style={styles.errorContainer}>
            <FieldError error={error ?? undefined} isInvalid={!!error} />
          </View>

          <View style={styles.form}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder='Name'
              icon='person-outline'
              autoCapitalize='words'
              autoComplete='name'
            />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder='Email'
              icon='mail-outline'
              keyboardType='email-address'
              autoCapitalize='none'
              autoComplete='email'
            />

            <PasswordInput
              value={password}
              onChangeText={setPassword}
              placeholder='New Password'
              autoComplete='password-new'
            />

            <PasswordInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder='Confirm Password'
              autoComplete='password-new'
            />

            {password.length > 0 && (
              <View style={styles.requirements}>
                {passwordRequirements.map((requirement, index) => (
                  <View key={index} style={styles.requirementRow}>
                    <Ionicons
                      name={requirement.met ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={requirement.met ? colors.success : colors.danger}
                    />
                    <Text size='xs' style={{ color: requirement.met ? colors.success : colors.danger }}>
                      {requirement.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

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
              <PrimaryButton
                onPress={handleSignUp}
                isLoading={isLoading}
                isDisabled={!allRequirementsMet || !passwordsMatch}
              >
                Create Account
              </PrimaryButton>
            </View>

            <View style={styles.linkContainer}>
              <Text size='sm' muted>
                Already have an account?{' '}
              </Text>
              <Link href='/(auth)/login' asChild>
                <TouchableOpacity>
                  <Text size='sm' weight='medium' accent>
                    Sign in
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
  requirements: {
    gap: spacing[2],
    marginTop: spacing[2],
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
