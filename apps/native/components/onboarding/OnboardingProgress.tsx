import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useEffect } from 'react'

import { useColors } from '@/hooks/use-theme-color'
import { radii } from '@/theme/radii'
import { spacing } from '@/theme/spacing'

type Props = {
  current: number
  total: number
}

export function OnboardingProgress({ current, total }: Readonly<Props>) {
  const colors = useColors()
  const progress = useSharedValue(current / total)

  useEffect(() => {
    progress.value = withTiming(current / total, { duration: 350 })
  }, [current, total, progress])

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[styles.fill, { backgroundColor: colors.accent }, barStyle]}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2],
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
  },
})
