import { forwardRef, useCallback, useEffect, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import type { BottomSheetFooterProps } from '@gorhom/bottom-sheet'
import Toast from 'react-native-toast-message'

import { AppBottomSheet, SheetFooter } from '@/components/bottom-sheet'
import { LengthUnitPicker } from '@/components/preferences/length-unit-picker'
import type { LengthUnit } from '@burn-app/user-preferences'
import { Button, Input, Spinner, Text } from '@/components/ui'
import { getProfileErrorMessage } from '@/lib/api/profile'
import { useUserPreferencesStore } from '@/store/user-preferences-store'
import { spacing } from '@/theme/spacing'

export type PreferencesSheetRef = {
  open: (snapIndex?: number) => void
  close: () => void
}

type PreferencesSheetProps = {
  onClose?: () => void
}

export const PreferencesSheet = forwardRef<PreferencesSheetRef, PreferencesSheetProps>(function PreferencesSheet({ onClose }, ref) {
  const patchPreferences = useUserPreferencesStore(s => s.patchPreferences)
  const cached = useUserPreferencesStore(s => s.preferences)

  const [lengthUnit, setLengthUnit] = useState<LengthUnit>('metric')
  const [heightCmRaw, setHeightCmRaw] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (cached) {
      setLengthUnit(cached.lengthUnit)
      setHeightCmRaw(cached.heightCm != null ? String(cached.heightCm) : '')
    }
  }, [cached])

  const closeSheet = useCallback(() => {
    if (typeof ref === 'object' && ref?.current) ref.current.close()
  }, [ref])

  const save = useCallback(async () => {
    setSaving(true)
    try {
      const preferences: { lengthUnit: LengthUnit; heightCm?: number } = { lengthUnit }
      if (heightCmRaw.trim() !== '') {
        const h = Number(heightCmRaw)
        if (!Number.isFinite(h) || h < 40 || h > 272) {
          Toast.show({ type: 'error', text1: 'Height must be between 40 and 272 cm.' })
          setSaving(false)
          return
        }
        preferences.heightCm = h
      }
      await patchPreferences(preferences)
      Toast.show({ type: 'success', text1: 'Preferences saved' })
      closeSheet()
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: getProfileErrorMessage(e)
      })
    } finally {
      setSaving(false)
    }
  }, [closeSheet, heightCmRaw, lengthUnit, patchPreferences])

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <SheetFooter {...props}>
        <View style={styles.footer}>
          <Button
            variant='outline'
            onPress={closeSheet}
            disabled={saving}
            style={styles.footerButton}
          >
            Cancel
          </Button>
          <Button
            onPress={() => void save()}
            disabled={saving}
            style={styles.footerButton}
          >
            {saving ? <Spinner size='sm' /> : 'Save'}
          </Button>
        </View>
      </SheetFooter>
    ),
    [closeSheet, save, saving]
  )

  return (
    <AppBottomSheet
      ref={ref}
      headerTitle='Measurements'
      onClose={onClose}
      footerComponent={renderFooter}
    >
      <View style={styles.body}>
        <Text
          size='sm'
          muted
          style={styles.caption}
        >
          Choose how distances and weight appear in the app.
        </Text>
        <LengthUnitPicker
          value={lengthUnit}
          onChange={setLengthUnit}
          disabled={saving}
        />
        <View style={styles.heightBlock}>
          <Text
            size='sm'
            weight='semibold'
          >
            Height (cm)
          </Text>
          <Text
            size='xs'
            muted
            style={styles.heightHint}
          >
            Needed so BMI can be calculated when your weight is recorded on assessments.
          </Text>
          <Input
            value={heightCmRaw}
            onChangeText={setHeightCmRaw}
            placeholder='e.g. 175'
            keyboardType='decimal-pad'
            editable={!saving}
          />
        </View>
      </View>
    </AppBottomSheet>
  )
})

const styles = StyleSheet.create({
  body: {
    gap: spacing[4],
    paddingBottom: spacing[4]
  },
  caption: {
    marginBottom: spacing[1]
  },
  heightBlock: {
    gap: spacing[2]
  },
  heightHint: {
    marginTop: -spacing[1]
  },
  footer: {
    flexDirection: 'row',
    gap: spacing[3]
  },
  footerButton: {
    flex: 1
  }
})
