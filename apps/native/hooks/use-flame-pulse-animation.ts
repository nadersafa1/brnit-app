import { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

const PULSE_UP_MS = 520
const PULSE_DOWN_MS = 440

/**
 * Drives a 0→1→0 loop for the flame loader. Stops when `animating` is false.
 * Lives in a hook so the indicator component stays focused on layout/colors.
 */
export function useFlamePulseAnimation(animating: boolean): Animated.Value {
  const progress = useRef(new Animated.Value(0)).current
  const loopRef = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (!animating) {
      loopRef.current?.stop()
      progress.stopAnimation()
      return
    }

    loopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: PULSE_UP_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: PULSE_DOWN_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    )

    loopRef.current.start()

    return () => {
      loopRef.current?.stop()
      progress.stopAnimation()
    }
  }, [animating, progress])

  return progress
}
