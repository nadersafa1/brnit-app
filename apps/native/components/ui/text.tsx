import { Text as RNText, StyleSheet, TextProps as RNTextProps } from 'react-native'
import { useColors } from '@/hooks/use-theme-color'
import { fontSize as fontSizes, fontWeight as fontWeights } from '@/theme/typography'

type TextSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'
type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold'

export interface TextProps extends RNTextProps {
  size?: TextSize
  weight?: TextWeight
  color?: string
  muted?: boolean
  accent?: boolean
  danger?: boolean
}

function getTextColor(
  colors: ReturnType<typeof useColors>,
  options: { color?: string; danger?: boolean; accent?: boolean; muted?: boolean }
): string {
  if (options.color) return options.color
  if (options.danger) return colors.danger
  if (options.accent) return colors.accent
  if (options.muted) return colors.muted
  return colors.ink
}

export function Text(props: Readonly<TextProps>) {
  const {
    size = 'base',
    weight = 'normal',
    color,
    muted,
    accent,
    danger,
    style,
    ...rest
  } = props

  const colors = useColors()
  const textColor = getTextColor(colors, { color, danger, accent, muted })

  return (
    <RNText
      style={[
        sizeStyles[size],
        { fontWeight: fontWeights[weight], color: textColor },
        style,
      ]}
      {...rest}
    />
  )
}

const sizeStyles = StyleSheet.create({
  xs: { fontSize: fontSizes.xs, lineHeight: 16 },
  sm: { fontSize: fontSizes.sm, lineHeight: 20 },
  base: { fontSize: fontSizes.base, lineHeight: 24 },
  lg: { fontSize: fontSizes.lg, lineHeight: 28 },
  xl: { fontSize: fontSizes.xl, lineHeight: 28 },
  '2xl': { fontSize: fontSizes['2xl'], lineHeight: 32 },
  '3xl': { fontSize: fontSizes['3xl'], lineHeight: 36 },
  '4xl': { fontSize: fontSizes['4xl'], lineHeight: 44 },
})
