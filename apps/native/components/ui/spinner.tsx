import type { ActivityIndicatorProps } from 'react-native'
import { useColorSchemeValue, useColors } from '@/hooks/use-theme-color'
import { colorValueToString } from '@/lib/color-value-string'
import { getFlameIconDefaultColor } from '@/lib/flame-icon-default-color'
import type { ThemeColors } from '@/theme/colors'
import { FlameActivityIndicator } from './flame-activity-indicator'

type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerVariant = 'default' | 'muted'

export interface SpinnerProps extends Omit<ActivityIndicatorProps, 'size'> {
  size?: SpinnerSize
  variant?: SpinnerVariant
  outerTint?: string
  innerTint?: string
  glowTint?: string
  innerScale?: number
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 20,
  md: 24,
  lg: 28,
}

type FlamePalette = { outer: string; inner: string; glow: string }

function getSpinnerPalette(
  variant: SpinnerVariant,
  colors: ThemeColors,
  baseFlame: string
): FlamePalette {
  if (variant === 'muted') {
    return { outer: colors.muted, inner: colors.muted, glow: colors.muted }
  }
  return { outer: baseFlame, inner: baseFlame, glow: baseFlame }
}

/**
 * App-wide loading indicator: themed flame animation with optional variant presets.
 */
export function Spinner({ size = 'md', color, ...props }: Readonly<SpinnerProps>) {
  const colors = useColors()
  const scheme = useColorSchemeValue()
  const baseFlame = getFlameIconDefaultColor(colors, scheme)
  const {
    variant = 'default',
    outerTint,
    innerTint,
    glowTint,
    innerScale,
    ...rest
  } = props

  const palette = getSpinnerPalette(variant, colors, baseFlame)
  const resolvedColor = colorValueToString(color) ?? palette.outer

  return (
    <FlameActivityIndicator
      size={SIZE_MAP[size]}
      color={resolvedColor}
      outerTint={outerTint ?? resolvedColor}
      innerTint={innerTint ?? palette.inner}
      glowTint={glowTint ?? palette.glow}
      innerScale={innerScale}
      {...rest}
    />
  )
}
