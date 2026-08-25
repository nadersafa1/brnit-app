export type ShellPageWidth =
	| "narrow"
	| "medium"
	| "mediumWide"
	| "wide"
	| "full";

/**
 * The only place a page decides how wide it is. Centring happens here so no
 * page reaches for `mx-auto max-w-*` of its own and drifts from its neighbours.
 */
export const SHELL_PAGE_WIDTH_CLASS: Record<ShellPageWidth, string> = {
	narrow: "mx-auto w-full max-w-xl",
	medium: "mx-auto w-full max-w-3xl",
	mediumWide: "mx-auto w-full max-w-4xl",
	wide: "mx-auto w-full max-w-6xl",
	full: "w-full max-w-none",
};

/** design.json `typography.typeScale.h1`: 24/30/700. */
export const SHELL_PAGE_TITLE_CLASS =
	"font-bold text-2xl tracking-tight" as const;
