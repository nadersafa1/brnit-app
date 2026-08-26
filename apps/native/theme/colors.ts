import {
	type BrandColorScheme,
	brandColors,
	brandCore,
} from "@brnit/brand/tokens";

/**
 * The native palette: `@brnit/brand` roles plus the semantics that have no
 * brand token.
 *
 * The values are **not** forked here — `brandColors` is the shipped palette and
 * this file only adds what it deliberately leaves out. Three invariants travel
 * with those roles and are enforced by name at every call site:
 *
 * 1. `accent` is a **fill**. It measures 2.42:1 on `appBg` and never carries copy.
 * 2. `accentFg` is the accent colour for **copy and icons** on light or dark surfaces.
 * 3. `onAccent` is the **only** legal copy colour on an accent fill (7.26:1 light,
 *    7.90:1 dark). `design.json` asks for white there; white is 2.83:1 and was rejected.
 *
 * A fourth comes from the chrome roles: `navPill` is dark in both themes, so copy
 * on it is `chromeFg` / `chromeMuted`, never `ink` / `muted`.
 */

/** Re-exported for the few places that need a raw designer value. */
export const brand = brandCore;

/**
 * Status colours and absolutes. None of these has a brand token — the brand
 * palette covers surfaces, copy and the accent, and stops there.
 *
 * Each status role comes in two flavours for the same reason `accent` does:
 * the plain name is a **fill** (`design.json`'s `semantic.*`, which fails AA as
 * copy), and `*Fg` is the readable version for text and icons. Web makes the
 * same split — its `--destructive` is the readable red, never `#FF4D4F`.
 */
const nativeSemantic = {
	light: {
		/** Status fill: chips, dots, bar segments. Not a copy colour. */
		success: "#35C48B",
		/** Success copy and icons. 5.36:1 on `card`, 4.58:1 on `appBg`. */
		successFg: "#0F7A4F",
		/** Low-opacity green wash behind a success chip. Not for copy. */
		successSoft: "rgba(53, 196, 139, 0.15)",
		/** Status fill. Not a copy colour. */
		warning: "#FFB020",
		/** Status fill. Not a copy colour. */
		danger: "#FF4D4F",
		/** Error copy and icons. 6.03:1 on `card`, 5.16:1 on `appBg`. */
		dangerFg: "#C0202A",
		/** Status fill. Not a copy colour. */
		info: "#2F80ED",
		white: "#FFFFFF",
		black: "#000000",
		transparent: "transparent",
	},
	dark: {
		success: "#3DD69A",
		/** 11.40:1 on `appBg`. */
		successFg: "#5FE0A8",
		/** Low-opacity green wash behind a success chip. Not for copy. */
		successSoft: "rgba(61, 214, 154, 0.22)",
		warning: "#FFC14D",
		danger: "#FF6B6E",
		/** 8.29:1 on `appBg`. Matches web's dark `--destructive`. */
		dangerFg: "#FF8A80",
		info: "#5B9EF5",
		white: "#FFFFFF",
		black: "#000000",
		transparent: "transparent",
	},
} as const;

export const Colors = {
	light: { ...brandColors.light, ...nativeSemantic.light },
	dark: { ...brandColors.dark, ...nativeSemantic.dark },
} as const;

export type ColorScheme = BrandColorScheme;
export type ColorName = keyof typeof Colors.light;
/** Token map for one scheme; resolve at runtime via `useColors()`. */
export type ThemeColors = (typeof Colors)[ColorScheme];
