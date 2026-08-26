import { parseLocalDateString } from "./calendar-date";

/**
 * Display formatting for dates.
 *
 * `Intl.DateTimeFormat` replaces the app's former dayjs dependency: Hermes
 * ships full ICU, the app's copy is English-only, and the formatters are built
 * once at module scope because constructing one per render is expensive.
 *
 * Two flavours exist on purpose:
 *
 * - the plain formatters render an **instant** in the device's timezone
 *   (assessment timestamps, the selected day of the calendar strip);
 * - {@link formatCalendarDateLong} renders a `'YYYY-MM-DD'` **calendar date**
 *   with no timezone shift at all, for values like a date of birth that are a
 *   day on a calendar rather than a moment in time.
 */

const DISPLAY_LOCALE = "en-US";

const monthDayFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	day: "numeric",
	month: "long",
});

const monthYearFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	month: "long",
	year: "numeric",
});

const mediumDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	day: "numeric",
	month: "short",
	year: "numeric",
});

const weekdayShortFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	weekday: "short",
});

const calendarDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});

/** `"August 25"` — section headings for a non-today day. */
export function formatMonthDay(date: Date): string {
	return monthDayFormatter.format(date);
}

/** `"August 2026"` — the calendar strip's month label. */
export function formatMonthYear(date: Date): string {
	return monthYearFormatter.format(date);
}

/** `"Aug 25, 2026"` — assessment rows and sheet titles. */
export function formatMediumDate(date: Date): string {
	return mediumDateFormatter.format(date);
}

/** `"Mon"` — the weekday caption above a day pill. */
export function formatWeekdayShort(date: Date): string {
	return weekdayShortFormatter.format(date);
}

/** The day-of-month number shown inside a day pill. */
export function formatDayOfMonth(date: Date): string {
	return String(date.getDate());
}

/**
 * `"Aug 25, 2026"` for a `'YYYY-MM-DD'` calendar date, rendered in UTC so the
 * day never shifts under a negative offset. Empty string for anything invalid.
 */
export function formatCalendarDateLong(dateStr: string): string {
	const parsed = parseLocalDateString(dateStr);
	if (parsed === null) {
		return "";
	}
	return calendarDateFormatter.format(
		Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
	);
}
