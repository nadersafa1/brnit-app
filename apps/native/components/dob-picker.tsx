import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import React, { useCallback, useState } from 'react'
import { Platform, Pressable, StyleSheet, View } from 'react-native'

import { useColors } from '@/hooks/use-theme-color'
import {
  formatDobForApi,
  formatDobForDisplay,
  parseIsoToDate,
  toIsoDateString,
} from '@/lib/date-utils'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import { fontSize } from '@/theme/typography'
import { Text } from "@/components/ui/text";

export { formatDobForApi, formatDobForDisplay } from '@/lib/date-utils'

type DobPickerProps = {
  /** ISO date string (YYYY-MM-DD) or Date instance (e.g. from session). */
  value: string | Date | null | undefined
  onChange: (isoDate: string) => void
  placeholder?: string
  disabled?: boolean
  /** When true, the native date picker is shown inline immediately (e.g. on complete-profile screen). */
  showPickerInline?: boolean
}

export function DobPicker({ value, onChange, placeholder = 'Date of birth', disabled = false, showPickerInline = false }: Readonly<DobPickerProps>) {
  const colors = useColors()
  const [show, setShow] = useState(showPickerInline)
  const valueStr = toIsoDateString(value)
  const pickerDate = parseIsoToDate(valueStr)
  const maxDate = new Date()

  const onPickerChange = useCallback(
    (_: unknown, selected?: Date) => {
      if (Platform.OS === 'android') setShow(false)
      if (selected) {
        onChange(formatDobForApi(selected))
      }
    },
    [onChange]
  )

  const handleOpen = useCallback(() => {
    if (!disabled) setShow(true)
  }, [disabled])

  const displayLabel = valueStr ? formatDobForDisplay(valueStr) : placeholder

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons
          name='calendar-outline'
          size={16}
          color={colors.muted}
          style={styles.icon}
        />
        <Pressable
          onPress={handleOpen}
          disabled={disabled}
          style={[styles.touchable, { opacity: disabled ? 0.6 : 1 }]}
          accessibilityLabel={placeholder}
          accessibilityRole='button'
        >
          <Text
            size='base'
            style={[styles.text, { color: valueStr ? colors.ink : colors.muted }]}
            numberOfLines={1}
          >
            {displayLabel}
          </Text>
        </Pressable>
      </View>
      {show && (
        <>
          <DateTimePicker
            value={pickerDate}
            mode='date'
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            maximumDate={maxDate}
            onChange={onPickerChange}
          />
          {Platform.OS === 'ios' && (
            <Pressable
              onPress={() => setShow(false)}
              style={[styles.doneButton, { backgroundColor: colors.accent }]}
            >
              <Text
                size='base'
                weight='semibold'
                style={{ color: colors.white }}
              >
                Done
              </Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[2]
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing[4],
    minHeight: 48
  },
  icon: {
    marginRight: spacing[3]
  },
  touchable: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: spacing[3]
  },
  text: {
    fontSize: fontSize.base
  },
  doneButton: {
    paddingVertical: spacing[3],
    borderRadius: radii.sm,
    alignItems: 'center'
  }
})
