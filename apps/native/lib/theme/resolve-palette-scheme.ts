import { Appearance } from 'react-native'

import type { ColorScheme } from '@/theme/colors'

/**
 * Maps React Native’s reported scheme to our palette keys (`light` | `dark` only).
 *
 * When appearance is set to follow the OS, `useColorScheme()` may be `unspecified`.
 * Our color tokens only define `light` and `dark`, so we fall back to `Appearance.getColorScheme()`.
 */
export function resolvePaletteScheme(hookScheme: string | null | undefined): ColorScheme {
  if (hookScheme === 'dark') return 'dark'
  if (hookScheme === 'light') return 'light'
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}
