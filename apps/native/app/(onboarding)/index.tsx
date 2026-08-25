import { router } from 'expo-router'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PrimaryButton } from "@/components/ui/primary-button";
import { FlameIcon } from "@/components/ui/flame-icon";
import { Text } from "@/components/ui/text";
import { useColors } from '@/hooks/use-theme-color'
import { useAppSettingsStore } from '@/store/app-settings-store'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const setIsOnboarded = useAppSettingsStore((s) => s.setIsOnboarded)

  function handleGetStarted() {
    setIsOnboarded(true)
    router.replace('/(auth)')
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.appBg,
          paddingTop: insets.top + spacing[6],
          paddingBottom: insets.bottom + spacing[6],
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.accent }]}>
            <FlameIcon size={56} color={colors.white} />
          </View>
        </View>

        <Text size="3xl" weight="bold" style={styles.title}>
          Welcome to Brnit
        </Text>

        <Text size="base" muted style={styles.subtitle}>
          Track your workouts, monitor progress, and achieve your fitness goals.
        </Text>
      </View>

      <View style={styles.footer}>
        <PrimaryButton onPress={handleGetStarted}>Get Started</PrimaryButton>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing[4],
  },
  footer: {
    paddingBottom: spacing[4],
  },
})
