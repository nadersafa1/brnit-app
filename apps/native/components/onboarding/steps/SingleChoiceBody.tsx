import { useEffect } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'

import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import type { SingleChoiceStep } from '@/lib/onboarding/types'

type Props = {
  step: SingleChoiceStep
  value?: string
  onSelect: (value: string) => void
}

const STAGGER_DELAY = 80
const INITIAL_DELAY = 150
const FADE_DURATION = 300

function OptionRow({
  label,
  selected,
  onPress,
  index,
}: Readonly<{
  label: string
  selected: boolean
  onPress: () => void
  index: number
}>) {
  const colors = useColors()
  const progress = useSharedValue(selected ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 200 })
  }, [selected, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.accent],
    ),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.card, `${colors.accent}15`],
    ),
  }))

  return (
    <Animated.View
      entering={FadeIn.duration(FADE_DURATION).delay(
        INITIAL_DELAY + index * STAGGER_DELAY,
      )}
      exiting={FadeOut.duration(100)}
    >
      <Pressable onPress={onPress}>
        <Animated.View style={[styles.option, animatedStyle]}>
          <Text weight="medium" style={styles.label}>
            {label}
          </Text>
          <Ionicons
            name={selected ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={selected ? colors.accent : colors.muted}
          />
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

export function SingleChoiceBody({ step, value, onSelect }: Readonly<Props>) {
  const handleSelect = (optionValue: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onSelect(optionValue)
  }

  return (
    <View style={styles.container}>
      {step.options.map((option, i) => (
        <OptionRow
          key={option.id}
          label={option.label}
          selected={value === option.value}
          onPress={() => handleSelect(option.value)}
          index={i}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderWidth: 1,
    borderRadius: radii.md,
  },
  label: {
    flex: 1,
  },
})
