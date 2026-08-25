import type { ThemeColors } from "@/theme/colors";

/**
 * Default colour for the flame glyph.
 *
 * `ink` already flips with the scheme — near-black on the blush canvas,
 * off-white on charcoal — so there is no separate light/dark branch here.
 */
export function getFlameIconDefaultColor(colors: ThemeColors): string {
	return colors.ink;
}
