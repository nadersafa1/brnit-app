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

import { Text } from '@/components/ui'
import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'
import type { MultiChoiceChipsStep } from '@/lib/onboarding/types'

type Props = {
  step: MultiChoiceChipsStep
  values: string[]
  onToggle: (value: string) => void
}

const STAGGER_DELAY = 30
const INITIAL_DELAY = 60
const FADE_DURATION = 200

function Chip({
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
    progress.value = withTiming(selected ? 1 : 0, { duration: 180 })
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
      exiting={FadeOut.duration(60)}
    >
      <Pressable onPress={onPress}>
        <Animated.View style={[styles.chip, animatedStyle]}>
          <Text size="sm" weight="medium">
            {label}
          </Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  )
}

export function MultiChoiceChipsBody({ step, values, onToggle }: Readonly<Props>) {
  const handleToggle = (value: string) => {
    if (step.max && values.length >= step.max && !values.includes(value)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onToggle(value)
  }

  return (
    <View style={styles.container}>
      {step.options.map((option, i) => (
        <Chip
          key={option.id}
          label={option.label}
          selected={values.includes(option.value)}
          onPress={() => handleToggle(option.value)}
          index={i}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2.5],
    marginTop: spacing[8],
    paddingHorizontal: spacing[4],
  },
  chip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderWidth: 1,
    borderRadius: radii.pill,
  },
})
