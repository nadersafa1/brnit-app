import type { ActivityIndicatorProps } from 'react-native'
import { Animated, ColorValue, StyleSheet, View } from 'react-native'
import { useColorSchemeValue, useColors } from '@/hooks/use-theme-color'
import { useFlamePulseAnimation } from '@/hooks/use-flame-pulse-animation'
import { colorValueToString } from '@/lib/color-value-string'
import { getFlameIconDefaultColor } from '@/lib/flame-icon-default-color'
import type { ThemeColors } from '@/theme/colors'
import { FlameIcon } from './flame-icon'

export interface FlameActivityIndicatorProps
  extends Omit<ActivityIndicatorProps, 'size'> {
  size?: number
  outerTint?: string
  innerTint?: string
  glowTint?: string
  innerScale?: number
}

type FlameMotion = {
  glowOpacity: Animated.AnimatedInterpolation<number>
  outerTransform: ReturnType<typeof buildOuterTransform>
  innerTransform: ReturnType<typeof buildInnerTransform>
}

function buildOuterTransform(progress: Animated.Value) {
  return [
    {
      translateY: progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, -1.5, 0.4],
      }),
    },
    {
      scale: progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.94, 1.04, 0.96],
      }),
    },
    {
      rotate: progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: ['-2deg', '2deg', '-1deg'],
      }),
    },
  ]
}

function buildInnerTransform(progress: Animated.Value) {
  return [
    {
      translateY: progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.4, -2.4, 0],
      }),
    },
    {
      scale: progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.78, 1.03, 0.84],
      }),
    },
  ]
}

function buildFlameMotion(progress: Animated.Value): FlameMotion {
  return {
    glowOpacity: progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.12, 0.26, 0.18],
    }),
    outerTransform: buildOuterTransform(progress),
    innerTransform: buildInnerTransform(progress),
  }
}

function resolveFlameColors(
  colors: ThemeColors,
  color: ColorValue | undefined,
  outerTint: string | undefined,
  innerTint: string | undefined,
  glowTint: string | undefined,
  defaultIconColor: string
) {
  const outer = outerTint ?? colorValueToString(color) ?? defaultIconColor
  const inner = innerTint ?? defaultIconColor
  const glow = glowTint ?? outer
  return { outer, inner, glow }
}

/**
 * Branded loading indicator: layered FontAwesome5 fire icons with a soft glow.
 */
export function FlameActivityIndicator({
  size = 24,
  color,
  outerTint,
  innerTint,
  glowTint,
  innerScale = 0.78,
  animating = true,
  hidesWhenStopped = true,
  style,
  ...props
}: Readonly<FlameActivityIndicatorProps>) {
  const colors = useColors()
  const scheme = useColorSchemeValue()
  const defaultIconColor = getFlameIconDefaultColor(colors, scheme)
  const progress = useFlamePulseAnimation(animating)
  const { outer: flameColor, inner: coreColor, glow: resolvedGlowTint } = resolveFlameColors(
    colors,
    color,
    outerTint,
    innerTint,
    glowTint,
    defaultIconColor
  )
  const motion = buildFlameMotion(progress)

  if (!animating && hidesWhenStopped) {
    return null
  }

  return (
    <View
      accessibilityRole="progressbar"
      style={[styles.container, { width: size, height: size }, style]}
      {...props}
    >
      <Animated.View
        style={[
          styles.glow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: resolvedGlowTint,
            opacity: motion.glowOpacity,
            transform: [{ scale: 1.04 }],
          },
        ]}
      />
      <Animated.View style={[styles.iconLayer, { transform: motion.outerTransform }]}>
        <FlameIcon size={size} color={flameColor} />
      </Animated.View>
      <Animated.View style={[styles.iconLayer, { transform: motion.innerTransform }]}>
        <FlameIcon size={size * innerScale} color={coreColor} />
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
  },
  iconLayer: {
    position: 'absolute',
  },
})
