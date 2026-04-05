import { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Toast from 'react-native-toast-message'

import { PrimaryButton } from '@/components'
import { LengthUnitPicker } from '@/components/preferences/length-unit-picker'
import { Text } from '@/components/ui'
import type { LengthUnit } from '@burn-app/user-preferences'
import { useColors } from '@/hooks/use-theme-color'
import { getProfileErrorMessage } from '@/lib/api/profile'
import { useUserPreferencesStore } from '@/store/user-preferences-store'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

export default function PreferenceCatchUpScreen() {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const cached = useUserPreferencesStore((s) => s.preferences)
  const patchPreferences = useUserPreferencesStore((s) => s.patchPreferences)

  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('metric')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (cached) setLengthUnit(cached.lengthUnit)
  }, [cached])

  const handleContinue = useCallback(async () => {
    setSubmitting(true)
    try {
      await patchPreferences({ lengthUnit })
      router.replace('/')
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: getProfileErrorMessage(e),
      })
    } finally {
      setSubmitting(false)
    }
  }, [lengthUnit, patchPreferences])

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
        <Text size="3xl" weight="bold" style={styles.title}>
          A quick preference
        </Text>
        <Text size="base" muted style={styles.subtitle}>
          Choose units for measurements in the app. You can change this anytime in Profile.
        </Text>
        <View style={styles.pickerWrap}>
          <LengthUnitPicker value={lengthUnit} onChange={setLengthUnit} disabled={submitting} />
        </View>
      </View>
      <View style={styles.footer}>
        <PrimaryButton onPress={() => void handleContinue()} disabled={submitting}>
          Continue
        </PrimaryButton>
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
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing[3],
  },
  subtitle: {
    textAlign: 'center',
    paddingHorizontal: spacing[2],
    marginBottom: spacing[8],
  },
  pickerWrap: {
    marginTop: spacing[2],
  },
  footer: {
    paddingBottom: spacing[4],
  },
})
