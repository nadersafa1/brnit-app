import { View, StyleSheet, Pressable } from 'react-native'
import { Redirect } from 'expo-router'

import { Spinner, Text } from '@/components/ui'
import { hrefOnboardingStep0 } from '@/constants/onboarding-router'
import { useUserPreferencesBootstrap } from '@/hooks/use-user-preferences-bootstrap'
import { useColors } from '@/hooks/use-theme-color'
import { authClient } from '@/lib/auth-client'
import { useIsOnboarded } from '@/store/app-settings-store'
import { useUserPreferencesStore } from '@/store/user-preferences-store'

export default function Index() {
  const colors = useColors()
  const isOnboarded = useIsOnboarded()
  const { data: session, isPending } = authClient.useSession()
  const userIdForPrefs =
    session?.user?.id && session.user.dob ? session.user.id : undefined
  const { status: prefStatus, needsCatchUp, errorMessage } =
    useUserPreferencesBootstrap(userIdForPrefs)
  const bootstrap = useUserPreferencesStore((s) => s.bootstrap)

  if (!isOnboarded) {
    return <Redirect href={hrefOnboardingStep0} />
  }

  if (isPending) {
    return (
      <View style={[styles.container, { backgroundColor: colors.appBg }]}>
        <Spinner size="lg" />
      </View>
    )
  }

  if (session?.user) {
    if (!session.user.dob) {
      return <Redirect href="/(auth)/complete-profile" />
    }

    if (prefStatus === 'loading' || prefStatus === 'idle') {
      return (
        <View style={[styles.container, { backgroundColor: colors.appBg }]}>
          <Spinner size="lg" />
        </View>
      )
    }

    if (prefStatus === 'error') {
      return (
        <View style={[styles.centered, { backgroundColor: colors.appBg, padding: 24 }]}>
          <Text size="base" style={{ textAlign: 'center', marginBottom: 16 }}>
            {errorMessage ?? 'Could not load preferences'}
          </Text>
          <Pressable
            onPress={() => void bootstrap(session.user!.id)}
            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          >
            <Text size="base" weight="semibold" style={{ color: colors.white }}>
              Retry
            </Text>
          </Pressable>
        </View>
      )
    }

    if (needsCatchUp) {
      return <Redirect href="/preference-catch-up" />
    }

    return <Redirect href="/(tabs)" />
  }

  return <Redirect href="/(auth)" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
})
