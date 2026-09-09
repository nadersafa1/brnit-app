/**
 * The locales the public site ships in.
 *
 * Brnit sells into bilingual workplaces, so Arabic is a first-class locale
 * rather than a translation afterthought: `dir` travels with the locale and is
 * written onto `<html>` by the provider, which is what every logical-property
 * utility in the landing page (`ms-*`, `pe-*`, `text-start`) keys off.
 */
export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export type Direction = "ltr" | "rtl";

const DEFAULT_LOCALE: Locale = "en";

/** Shared with the blocking script in `index.html`. Keep them in sync. */
export const LOCALE_STORAGE_KEY = "brnit-locale";

interface LocaleMeta {
	/** Writing direction, mirrored onto `<html dir>`. */
	dir: Direction;
	/** The language's own name, for the switcher. */
	label: string;
	/** Short code shown on the compact (mobile) switcher. */
	short: string;
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
	ar: { dir: "rtl", label: "العربية", short: "ع" },
	en: { dir: "ltr", label: "English", short: "EN" },
};

function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && LOCALES.includes(value as Locale);
}

/**
 * Stored choice first, then the browser's preferences, then English. Reading
 * `localStorage` can throw in a locked-down browser, so it is guarded exactly
 * like the theme script's read.
 */
export function resolveInitialLocale(): Locale {
	if (typeof window === "undefined") {
		return DEFAULT_LOCALE;
	}

	try {
		const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
		if (isLocale(stored)) {
			return stored;
		}
	} catch {
		// Storage is unavailable — fall through to the browser preference.
	}

	for (const preference of window.navigator.languages ?? []) {
		const base = preference.split("-")[0];
		if (isLocale(base)) {
			return base;
		}
	}

	return DEFAULT_LOCALE;
}
