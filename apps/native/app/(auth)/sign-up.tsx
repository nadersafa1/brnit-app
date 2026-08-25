import { Ionicons } from '@expo/vector-icons'
import { Link, Redirect } from 'expo-router'
import { useState } from 'react'
import { Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AuthSocialIconButtons } from "@/components/auth/auth-social-icon-buttons";
import { AuthSuccessScreen } from "@/components/auth/auth-success-screen";
import { DobPicker } from "@/components/dob-picker";
import { PasswordInput } from "@/components/password-input";
import { TextInput } from "@/components/text-input";
import { PrimaryButton } from "@/components/ui/primary-button";
import { FieldError } from "@/components/ui/field-error";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { BETTER_AUTH_SOCIAL_CALLBACK_PATH } from '@/constants/better-auth-social'
import { DEEP_LINKS } from '@/constants/deep-links'
import { useColors, useShadows } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { createSocialSignInCallbacks } from '@/lib/auth-social-callbacks'
import { dobIsoStringToDate, isValidPastDob } from '@/lib/date-utils'
import { signInWithAppleUsingBetterAuth } from '@/lib/sign-in-with-apple-better-auth'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

interface PasswordRequirement {
  label: string
  met: boolean
}

export default function SignUpScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const elevation = useShadows()
  const { data: session, isPending } = authClient.useSession()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isEmailLoading, setIsEmailLoading] = useState(false)
  const [isSocialLoading, setIsSocialLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isFormBusy = isEmailLoading || isSocialLoading
  const [sent, setSent] = useState(false)

  /** Sign in with Apple exists only on iOS; availability is enforced again inside the Apple auth module on tap. */
  const showAppleSocialButton = Platform.OS === 'ios'

  if (isPending) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.appBg }]}>
        <Spinner size='lg' />
      </View>
    )
  }

  if (session?.user) {
    if (!session.user.dob) {
      return <Redirect href='/(auth)/complete-profile' />
    }
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
  const isDobValid = isValidPastDob(dob)

  async function handleSignUp() {
    if (!isDobValid) {
      setError('Enter date of birth as YYYY-MM-DD and make sure it is in the past')
      return
    }
    if (!allRequirementsMet) {
      setError('Please meet all password requirements')
      return
    }
    if (!passwordsMatch) {
      setError('Passwords do not match')
      return
    }

    setIsEmailLoading(true)
    setError(null)

    await authClient.signUp.email(
      {
        name,
        email,
        dob: dobIsoStringToDate(dob),
        password,
        callbackURL: DEEP_LINKS.root,
      },
      {
        onError(error) {
          setError(error.error?.message || 'Failed to sign up')
          setIsEmailLoading(false)
        },
        onSuccess() {
          setName('')
          setEmail('')
          setDob('')
          setPassword('')
          setConfirmPassword('')
          setSent(true)
        },
        onFinished() {
          setIsEmailLoading(false)
        },
      }
    )
  }

  async function handleGoogleLogin() {
    setIsSocialLoading(true)
    setError(null)
    try {
      await authClient.signIn.social(
        { provider: 'google', callbackURL: BETTER_AUTH_SOCIAL_CALLBACK_PATH },
        createSocialSignInCallbacks(setError, setIsSocialLoading, 'Google sign-in failed'),
      )
    } finally {
      setIsSocialLoading(false)
    }
  }

  async function handleAppleLogin() {
    try {
      await signInWithAppleUsingBetterAuth(authClient, {
        setError,
        setIsLoading: setIsSocialLoading,
        callbackURL: BETTER_AUTH_SOCIAL_CALLBACK_PATH,
      })
    } finally {
      setIsSocialLoading(false)
    }
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

        <View style={[styles.card, { backgroundColor: colors.card }, elevation.lg]}>
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

            <DobPicker value={dob} onChange={setDob} placeholder='Date of birth' />

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
                  <View key={`${requirement.label}-${index}`} style={styles.requirementRow}>
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

            <AuthSocialIconButtons
              isLoading={isFormBusy}
              cardBackgroundColor={colors.card}
              iconMutedColor={colors.subtle}
              onGooglePress={handleGoogleLogin}
              onApplePress={showAppleSocialButton ? handleAppleLogin : undefined}
              showApple={showAppleSocialButton}
            />

            <View style={styles.buttonContainer}>
              <PrimaryButton
                onPress={handleSignUp}
                isLoading={isEmailLoading}
                isDisabled={!allRequirementsMet || !passwordsMatch || !isDobValid || isSocialLoading}
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
