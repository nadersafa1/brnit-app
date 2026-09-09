import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { ar } from "./dictionary-ar";
import { type Dictionary, en } from "./dictionary-en";
import {
	type Direction,
	LOCALE_META,
	LOCALE_STORAGE_KEY,
	type Locale,
	resolveInitialLocale,
} from "./locales";

const DICTIONARIES: Record<Locale, Dictionary> = { ar, en };

interface I18nValue {
	/** The active locale's copy. Fully typed — `copy.hero.titleLead`, not `t("…")`. */
	copy: Dictionary;
	dir: Direction;
	/** Locale-aware digits, kept Latin in Arabic to match the wordmark. */
	formatNumber: (value: number) => string;
	locale: Locale;
	setLocale: (next: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Language state for the whole app.
 *
 * `<html lang>` and `<html dir>` are written here, which is what every logical
 * Tailwind utility on the landing page keys off — mirroring how `ThemeProvider`
 * owns `<html class>`. The initial value is resolved before first paint by the
 * blocking script in `index.html`; this effect only keeps it in step.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(resolveInitialLocale);
	const dir = LOCALE_META[locale].dir;

	useEffect(() => {
		const root = document.documentElement;
		root.lang = locale;
		root.dir = dir;
	}, [dir, locale]);

	const setLocale = useCallback((next: Locale) => {
		setLocaleState(next);
		try {
			window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
		} catch {
			// A locked-down browser just loses the preference between visits.
		}
	}, []);

	const value = useMemo<I18nValue>(() => {
		// `-u-nu-latn` keeps Western digits in Arabic: the brand's numerals are
		// Latin everywhere else in the product, and mixed numerals read as a bug.
		const formatter = new Intl.NumberFormat(
			locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB"
		);

		return {
			copy: DICTIONARIES[locale],
			dir,
			formatNumber: (input: number) => formatter.format(input),
			locale,
			setLocale,
		};
	}, [dir, locale, setLocale]);

	return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
	const value = useContext(I18nContext);

	if (!value) {
		throw new Error("useI18n must be used inside <I18nProvider>");
	}

	return value;
}
