import type { ColorScheme, ThemeColors } from '@/theme/colors'

/**
 * Matches `color="black"` on light surfaces; uses white on dark so the glyph stays visible.
 */
export function getFlameIconDefaultColor(colors: ThemeColors, scheme: ColorScheme): string {
  return scheme === 'dark' ? colors.white : colors.black
}
