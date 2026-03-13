import { useColorScheme } from 'react-native'
import { Colors, ColorName, ColorScheme } from '@/theme/colors'

export function useThemeColor(
  colorName: ColorName,
  props?: { light?: string; dark?: string }
): string {
  const scheme = (useColorScheme() ?? 'light') as ColorScheme
  const colorFromProps = props?.[scheme]

  if (colorFromProps) {
    return colorFromProps
  }

  return Colors[scheme][colorName]
}

export function useColors() {
  const scheme = (useColorScheme() ?? 'light') as ColorScheme
  return Colors[scheme]
}

export function useColorSchemeValue() {
  return (useColorScheme() ?? 'light') as ColorScheme
}
