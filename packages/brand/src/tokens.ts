/**
 * Brnit brand tokens — ported from `design.json` (Pastel Soft UI).
 *
 * Consumers: React Native (`apps/native/theme/colors.ts`) and email templates
 * (`packages/auth/src/send-email.ts`). Web consumes `./brand.css`, which
 * declares the SAME semantic roles in the SAME order and is hand-kept in sync
 * with this file — names map 1:1 by kebab-case (`accentFg` ->
 * `--brand-accent-fg`), with one deliberate exception: `appBg` is
 * `--brand-app`.
 *
 * Brnit is LIGHT-FIRST: `light` is the default scheme, `dark` is the override.
 *
 * Every contrast ratio quoted below was measured with the WCAG 2.1 relative
 * luminance formula. Ratios are stated as `fg on bg`.
 */

/**
 * Raw designer values straight from `design.json` / the wordmark artwork.
 * Never consume these directly in a component — go through `brandColors`
 * so the role (and its contrast guarantee) travels with the value.
 */
export const brandCore = {
	/** Vivid brand orange. Also the `brn` glyphs + flame in the wordmark. */
	accentOrange: "#FD6E20",
	/** Pastel lilac. Also the `it` glyphs in the wordmark. Decorative only. */
	pastelPurple: "#C9BEFA",
	/** Warm blush app canvas (`surface.appBackground`). */
	blush: "#FCE9E7",
	/** Near-black ink (`neutral.black`). */
	black: "#010409",
	/** Floating bottom-nav pill (`surface.navPill`). Dark in BOTH themes. */
	navBlack: "#0B0B0B",
	/** Warm charcoal canvas for dark mode. */
	charcoal: "#121110",
} as const;

/** Width / height ratios of the shipped PNG artwork. */
export const brandAspectRatios = {
	lockup: 1066 / 467,
	cover: 1080 / 1350,
} as const;

export type BrandAssetVariant = keyof typeof brandAspectRatios;

/** Client-facing product name. */
export const BRAND_DISPLAY_NAME = "Brnit" as const;

/**
 * Light-only transactional email palette — email clients have no theme toggle
 * and no CSS custom properties, so this is a flat, self-contained set.
 *
 * `accent` is a FILL. Copy on it must be `onAccent` (7.26:1); the previous
 * `#FFFFFF` on `#FD6E20` measured 2.83:1 and failed AA. Accent-coloured copy
 * (footer links) must use `accentFg` (5.60:1 on `wrapperBg`).
 */
export const brandEmail = {
	/** Button / banner fill. Never a text colour. */
	accent: brandCore.accentOrange,
	/** Accent-coloured copy: links, inline emphasis. 5.60:1 on `wrapperBg`. */
	accentFg: "#AE3F0A",
	/** The only legal copy colour on `accent`. 7.26:1. */
	onAccent: brandCore.black,
	/** Message card. */
	background: "#FFFFFF",
	/** Page shell behind the card. */
	wrapperBg: "#FAF7F5",
	/** Hairline between header / content / footer. Not a text colour. */
	border: "#E8E8E8",
	/** Body copy. 14.68:1 on `background`. */
	text: "#1F2937",
	/** Footer / secondary copy. 5.00:1 on `wrapperBg`. */
	textMuted: "#6B6B6B",
	danger: "#FF4D4F",
	success: "#35C48B",
	warning: "#FFB020",
} as const;

/**
 * Semantic colour roles, one map per scheme.
 *
 * React Native note: alpha values are written as `rgba(r, g, b, a)` with 0–1
 * alpha. Do NOT switch these to the modern `rgb(… / 28%)` syntax — React
 * Native's colour parser rejects it and silently renders black.
 */
export const brandColors = {
	light: {
		/**
		 * Vivid orange FILL — primary buttons, active nav pill, progress fills,
		 * selected day pill, focus accents. Never a text colour: it measures
		 * 2.42:1 on `appBg` and 2.83:1 on `card`. Use `accentFg` for copy.
		 */
		accent: brandCore.accentOrange,
		/**
		 * Accent-coloured COPY and icons on light surfaces.
		 * 5.11:1 on `appBg`, 5.97:1 on `card`, 5.34:1 on `surfaceAlt` — AA at
		 * every text size. Never use it as a large fill; it reads as brown.
		 */
		accentFg: "#AE3F0A",
		/** Softer orange for gradients, hover fills and illustration tints. Not for copy. */
		accentLight: "#FF8F50",
		/** Low-opacity orange wash behind selected chips / focus halos. Not for copy. */
		accentSoft: "rgba(253, 110, 32, 0.14)",
		/**
		 * The ONLY legal copy colour on an `accent` fill. 7.26:1.
		 * `design.json` specifies white here; white measures 2.83:1 and fails AA,
		 * so brnit ships near-black on orange instead.
		 */
		onAccent: brandCore.black,
		/** Primary copy and icons. 17.55:1 on `appBg`, 20.54:1 on `card`. */
		ink: brandCore.black,
		/**
		 * Tertiary copy: captions, placeholders, chevrons, timestamps.
		 * 4.55:1 on `appBg`, 5.33:1 on `card`, 4.76:1 on `surfaceAlt`.
		 * Never use on `navPill` chrome — use `chromeMuted` there.
		 */
		muted: "#6B6B6B",
		/**
		 * Secondary copy — one step stronger than `muted`, for supporting lines
		 * that still need to be comfortably scannable. 9.72:1 on `appBg`.
		 */
		subtle: "#3A3A3A",
		/**
		 * Hairline separators and progress-bar tracks. Brnit groups with
		 * elevation and whitespace, so a visible border is the exception —
		 * reach for `card` + a shadow first. Never a text colour.
		 */
		border: "#E8E8E8",
		/** Inset wells: icon tiles, capsule-chart tracks, table zebra rows. */
		surfaceAlt: "#F2F2F2",
		/** Warm blush canvas the whole app sits on. */
		appBg: brandCore.blush,
		/** Raised card / sheet / floating control. Pair with a soft shadow, not a border. */
		card: "#FFFFFF",
		/** A quieter card, for nested panels that must not compete with `card`. */
		cardAlt: "#F7F7F7",
		/** Translucent card sitting ON a coloured or photographic surface. */
		cardOnBrand: "rgba(1, 4, 9, 0.06)",
		/** Floating bottom-nav / dark chrome bar. Stays dark in BOTH themes. */
		navPill: brandCore.navBlack,
		/** Inactive segment inside `navPill`. */
		navPillMuted: "#1A1A1A",
		/**
		 * Copy and icons on `navPill` / `navPillMuted` — the chrome is dark in
		 * both themes, so `ink` would be invisible there. 18.44:1 on `navPill`.
		 */
		chromeFg: "#FAF7F4",
		/** Inactive labels on dark chrome. 9.37:1 on `navPill`, 8.29:1 on `navPillMuted`. */
		chromeMuted: "#B8B2AC",
		/** Solid press/hover lift for chrome buttons — keeps `chromeFg` readable. */
		chromeHover: "#1A1A1A",
		/** Soft white wash for a segment sitting INSIDE a dark chrome track. */
		chromeOverlay: "rgba(255, 255, 255, 0.12)",
		/**
		 * Pastel lilac — corner blob, illustration accents, empty-state art.
		 * Never an action colour, never a text colour (1.47:1 on `appBg`).
		 * If copy must sit on it, use `ink` (11.96:1).
		 */
		decorative: brandCore.pastelPurple,
		/** Press wash / row hover on light surfaces. */
		overlaySoft: "rgba(1, 4, 9, 0.06)",
		/** Pressed state / stronger divider wash on light surfaces. */
		overlayStrong: "rgba(1, 4, 9, 0.12)",
		/** Modal and bottom-sheet backdrop (`color.tokens.overlay.scrim`). */
		scrim: "rgba(1, 4, 9, 0.35)",
		/** Soft blurred elevation colour (`color.tokens.overlay.shadowColor`). */
		shadow: "rgba(1, 4, 9, 0.12)",
		/** 2px focus ring — orange at low opacity, per `accessibility.states.focus`. */
		focusRing: "rgba(253, 110, 32, 0.4)",
	},
	dark: {
		/** Warmed-up orange FILL for charcoal surfaces. Fill only, same rule as light. */
		accent: "#FF7A2E",
		/**
		 * Accent-coloured COPY on dark surfaces. 9.01:1 on `appBg`, 8.04:1 on
		 * `card`. Brighter than `accent` because thin glyphs lose weight on
		 * charcoal.
		 */
		accentFg: "#FF9A5C",
		/** Softer orange for gradients and illustration tints. Not for copy. */
		accentLight: "#FF9A5C",
		/** Low-opacity orange wash behind selected chips / focus halos. Not for copy. */
		accentSoft: "rgba(255, 122, 46, 0.22)",
		/** The ONLY legal copy colour on an `accent` fill. 7.90:1. */
		onAccent: brandCore.black,
		/** Primary copy and icons. 16.88:1 on `appBg`, 15.07:1 on `card`. */
		ink: "#F4F2EF",
		/**
		 * Tertiary copy. 6.35:1 on `appBg`, 5.67:1 on `card`.
		 * Never use on `navPill` chrome — use `chromeMuted` there.
		 */
		muted: "#9A958F",
		/** Secondary copy — one step stronger than `muted`. 11.48:1 on `appBg`. */
		subtle: "#CFC9C1",
		/** Hairline separators and progress-bar tracks. Never a text colour. */
		border: "#35312E",
		/** Inset wells: icon tiles, capsule-chart tracks, table zebra rows. */
		surfaceAlt: "#1B1A18",
		/** Warm charcoal canvas the whole app sits on. */
		appBg: brandCore.charcoal,
		/** Raised card / sheet / floating control, lifted one step above `appBg`. */
		card: "#1E1D1B",
		/** A quieter card, for nested panels that must not compete with `card`. */
		cardAlt: "#252320",
		/** Translucent card sitting ON a coloured or photographic surface. */
		cardOnBrand: "rgba(255, 255, 255, 0.1)",
		/** Floating bottom-nav / dark chrome bar. Lifted so it reads above `card`. */
		navPill: "#2C2926",
		/** Inactive segment inside `navPill`. */
		navPillMuted: "#3A3733",
		/** Copy and icons on dark chrome. 13.55:1 on `navPill`, 11.09:1 on `navPillMuted`. */
		chromeFg: "#FAF7F4",
		/** Inactive labels on dark chrome. 6.89:1 on `navPill`, 5.64:1 on `navPillMuted`. */
		chromeMuted: "#B8B2AC",
		/** Solid press/hover lift for chrome buttons — keeps `chromeFg` readable. */
		chromeHover: "#3A3733",
		/** Soft white wash for a segment sitting INSIDE a dark chrome track. */
		chromeOverlay: "rgba(255, 255, 255, 0.1)",
		/** Pastel lilac, desaturated for charcoal. Decorative only; `ink` on it is 9.75:1. */
		decorative: "#B8A9F0",
		/** Press wash / row hover on dark surfaces. */
		overlaySoft: "rgba(255, 255, 255, 0.08)",
		/** Pressed state / stronger divider wash on dark surfaces. */
		overlayStrong: "rgba(255, 255, 255, 0.14)",
		/** Modal and bottom-sheet backdrop. */
		scrim: "rgba(0, 0, 0, 0.6)",
		/** Elevation colour — opaque black, since a tinted shadow vanishes on charcoal. */
		shadow: "rgba(0, 0, 0, 0.55)",
		/** 2px focus ring — orange at low opacity. */
		focusRing: "rgba(255, 122, 46, 0.45)",
	},
} as const;

export type BrandColorScheme = keyof typeof brandColors;
export type BrandColorRole = keyof (typeof brandColors)["light"];
/** Token map for one scheme; resolve at runtime via the native `useColors()` hook. */
export type BrandColorTokens = (typeof brandColors)[BrandColorScheme];

/**
 * Relative paths under `@brnit/brand/assets/`.
 * Both files are the wordmark on a white ground — there is no dark-ground
 * variant yet, so place them on `card` / `#FFFFFF`, never on `navPill`.
 */
export const brandAssetPaths = {
	/** Tight-cropped horizontal wordmark (1066×467). App headers, email header. */
	lockup: "logo-lockup.png",
	/** Padded 4:5 wordmark (1080×1350). Splash, store listings, share cards. */
	cover: "logo-cover.png",
	/** Email clients cannot use CSS variables — this is the file `sendEmail` links. */
	emailLogo: "logo-lockup.png",
} as const;
