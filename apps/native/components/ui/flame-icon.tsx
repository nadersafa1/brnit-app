import { FontAwesome5 } from '@expo/vector-icons'

export type FlameIconProps = Readonly<{
  /** Default 24 to match app-wide flame usage. */
  size?: number
  color: string
}>

/**
 * Single Fire glyph (FontAwesome5) — use for static flame affordances (streak, onboarding, etc.).
 */
export function FlameIcon({ size = 24, color }: FlameIconProps) {
  return <FontAwesome5 name="fire" size={size} color={color} />
}
