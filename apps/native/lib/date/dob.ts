import { toDateStringUTC } from "@brnit/datetime";

import {
	isCalendarDateString,
	parseLocalDateString,
	toLocalDateString,
	todayLocalDateString,
} from "./calendar-date";
import { formatCalendarDateLong } from "./format-date";

/**
 * Date of birth: parsing, validation and display.
 *
 * `user.dob` is a `date` column, so it is a calendar day and never an instant.
 * The three boundaries it crosses are each handled explicitly:
 *
 * - **Reading the session** — better-auth may hand back a `Date`, which is UTC
 *   midnight of the stored day, so it is read with `toDateStringUTC`. Reading
 *   it locally would move the birthday a day earlier west of Greenwich.
 * - **Writing** — {@link dobIsoStringToDate} builds UTC midnight, matching what
 *   `new Date("YYYY-MM-DD")` produces on web and what the server writes back.
 * - **The picker** — `DateTimePicker` works in local time, so
 *   {@link parseIsoToDate} and {@link formatDobForApi} round-trip through the
 *   device's own calendar day.
 */

/** Normalizes a session `Date` or a raw string to `'YYYY-MM-DD'`, or `""`. */
export function toIsoDateString(
	value: string | Date | null | undefined
): string {
	if (value == null) {
		return "";
	}
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? "" : toDateStringUTC(value);
	}
	const trimmed = value.trim();
	return isCalendarDateString(trimmed) ? trimmed : "";
}

/** The picker hands back a local `Date`; the API wants that local day. */
export function formatDobForApi(date: Date): string {
	return toLocalDateString(date);
}

/** `"Jan 15, 1990"`, or `""` when there is nothing valid to show. */
export function formatDobForDisplay(
	isoOrDate: string | Date | null | undefined
): string {
	const iso = toIsoDateString(isoOrDate);
	return iso === "" ? "" : formatCalendarDateLong(iso);
}

/** True for a `'YYYY-MM-DD'` string naming a real day that is not in the future. */
export function isValidPastDob(value: string): boolean {
	const trimmed = value.trim();
	if (!isCalendarDateString(trimmed)) {
		return false;
	}
	return trimmed <= todayLocalDateString();
}

/** `'YYYY-MM-DD'` to local midnight for the picker; today when unparseable. */
export function parseIsoToDate(iso: string): Date {
	return parseLocalDateString(iso.trim()) ?? new Date();
}

/**
 * A validated `'YYYY-MM-DD'` to **UTC midnight**, the value better-auth stores.
 * Call only after {@link isValidPastDob}.
 */
export function dobIsoStringToDate(iso: string): Date {
	const parsed = parseLocalDateString(iso.trim());
	if (parsed === null) {
		return new Date(Number.NaN);
	}
	return new Date(
		Date.UTC(
			parsed.getFullYear(),
			parsed.getMonth(),
			parsed.getDate(),
			0,
			0,
			0,
			0
		)
	);
}
