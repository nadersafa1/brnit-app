import { StyleSheet, View } from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

import { Input, Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { spacing } from '@/theme/spacing'
import type { MultiTextStep, OnboardingAnswers } from '@/lib/onboarding/types'

type Props = {
  step: MultiTextStep
  answers: OnboardingAnswers
  onFieldChange: (fieldId: string, value: string) => void
}

export function MultiTextBody({ step, answers, onFieldChange }: Readonly<Props>) {
  const colors = useColors()

  return (
    <View style={styles.container}>
      {step.fields.map((field, i) => {
        const raw = answers[field.id]
        const value = typeof raw === 'string' ? raw : ''

        return (
          <Animated.View
            key={field.id}
            entering={FadeIn.duration(300).delay(100 + i * 80)}
            style={styles.fieldWrapper}
          >
            <View style={styles.labelRow}>
              <Text size="sm" weight="medium">
                {field.label}
              </Text>
              {field.optional && (
                <Text size="xs" color={colors.muted}>
                  Optional
                </Text>
              )}
            </View>
            <View style={styles.inputRow}>
              <View style={styles.inputFlex}>
                <Input
                  value={value}
                  onChangeText={(v) => onFieldChange(field.id, v)}
                  placeholder={field.placeholder}
                  keyboardType={field.keyboardType ?? 'default'}
                />
              </View>
              {field.suffix && (
                <Text size="base" weight="medium" muted style={styles.suffix}>
                  {field.suffix}
                </Text>
              )}
            </View>
          </Animated.View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
    gap: spacing[5],
  },
  fieldWrapper: {
    gap: spacing[2],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  inputFlex: {
    flex: 1,
  },
  suffix: {
    width: 30,
  },
})
