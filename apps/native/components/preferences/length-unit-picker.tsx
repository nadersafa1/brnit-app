import { Pressable, StyleSheet, View } from 'react-native'

import { Text } from '@/components/ui'
import type { LengthUnit } from '@burn-app/user-preferences'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

type LengthUnitPickerProps = {
  value: LengthUnit
  onChange: (value: LengthUnit) => void
  disabled?: boolean
}

const OPTIONS: { value: LengthUnit; label: string; hint: string }[] = [
  { value: 'metric', label: 'Metric', hint: 'm, kg' },
  { value: 'imperial', label: 'Imperial', hint: 'ft, lb' },
]

export function LengthUnitPicker({ value, onChange, disabled }: LengthUnitPickerProps) {
  const colors = useColors()

  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const selected = opt.value === value
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? colors.accent : colors.card,
                borderColor: selected ? colors.accent : colors.border,
                opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
              },
            ]}
          >
            <Text
              size="base"
              weight="semibold"
              style={{ color: selected ? colors.white : colors.ink }}
            >
              {opt.label}
            </Text>
            <Text
              size="sm"
              style={{ color: selected ? colors.white : colors.muted, marginTop: spacing[1] }}
            >
              {opt.hint}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  option: {
    flex: 1,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: radii.lg,
    borderWidth: 1,
  },
})
