import { addDaysUTC, isUtcDateString } from "@brnit/datetime";

/**
 * The **device-local** half of brnit's date convention.
 *
 * The server computes every calendar day in UTC (`@brnit/datetime`), but the
 * member app must agree with the clock on the member's wrist: a meal eaten at
 * 22:00 in UTC+3 belongs to that member's day, not to tomorrow. So native
 * derives the calendar day from the device's local time here, and posts
 * `consumedAt` at **12:00 local** (see {@link localDateStringToNoonInstant}) so
 * neither side of the wire can land on a neighbouring day.
 *
 * Both halves are deliberate. Changing one alone silently breaks meal logging
 * near midnight.
 *
 * Once a `Date` has been reduced to a `'YYYY-MM-DD'` string, all further
 * arithmetic and comparison is delegated to `@brnit/datetime`, which is pure
 * string math on a fixed-width, zero-padded format — timezone-independent, and
 * therefore correct for a locally-derived date string too.
 */

const YEAR_DIGITS = 4;
const DATE_PART_DIGITS = 2;
const MONTH_START = 5;
const DAY_START = 8;
const MONTH_INDEX_OFFSET = 1;
const NOON_HOUR = 12;
const DAYS_PER_WEEK = 7;

interface LocalDateParts {
	day: number;
	month: number;
	year: number;
}

/** The device-local calendar day an instant falls on, as `'YYYY-MM-DD'`. */
export function toLocalDateString(date: Date): string {
	const year = String(date.getFullYear()).padStart(YEAR_DIGITS, "0");
	const month = String(date.getMonth() + MONTH_INDEX_OFFSET).padStart(
		DATE_PART_DIGITS,
		"0"
	);
	const day = String(date.getDate()).padStart(DATE_PART_DIGITS, "0");
	return `${year}-${month}-${day}`;
}

/** Today, as the device reckons it. The client's definition of "today". */
export function todayLocalDateString(): string {
	return toLocalDateString(new Date());
}

function localDateParts(dateStr: string): LocalDateParts | null {
	if (!isUtcDateString(dateStr)) {
		return null;
	}
	return {
		year: Number.parseInt(dateStr.slice(0, YEAR_DIGITS), 10),
		month: Number.parseInt(
			dateStr.slice(MONTH_START, MONTH_START + DATE_PART_DIGITS),
			10
		),
		day: Number.parseInt(
			dateStr.slice(DAY_START, DAY_START + DATE_PART_DIGITS),
			10
		),
	};
}

/** `'YYYY-MM-DD'` to local midnight, or `null` when it is not a real date. */
export function parseLocalDateString(dateStr: string): Date | null {
	const parts = localDateParts(dateStr);
	if (parts === null) {
		return null;
	}
	return new Date(parts.year, parts.month - MONTH_INDEX_OFFSET, parts.day);
}

/**
 * `'YYYY-MM-DD'` to **12:00 local**, the instant native sends as `consumedAt`.
 *
 * Noon is the widest possible margin from either midnight, so the server's
 * `consumedAt.toISOString().slice(0, 10)` lands on the same calendar day for
 * every offset in use (UTC-12 … UTC+14).
 */
export function localDateStringToNoonInstant(dateStr: string): Date | null {
	const parts = localDateParts(dateStr);
	if (parts === null) {
		return null;
	}
	return new Date(
		parts.year,
		parts.month - MONTH_INDEX_OFFSET,
		parts.day,
		NOON_HOUR
	);
}

/** Local midnight of `date`'s own day. */
export function startOfLocalDay(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Shifts by whole local days. Built on the `(year, month, day + n)` constructor
 * rather than millisecond arithmetic, so a DST boundary still yields the
 * neighbouring calendar day rather than a 23- or 25-hour offset.
 */
export function addLocalDays(date: Date, days: number): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Local midnight of the Sunday starting `date`'s week. */
export function startOfLocalWeek(date: Date): Date {
	return addLocalDays(date, -date.getDay());
}

export function isSameLocalDay(left: Date, right: Date): boolean {
	return toLocalDateString(left) === toLocalDateString(right);
}

/** True when the local calendar day of `date` is today on this device. */
export function isLocalToday(date: Date): boolean {
	return toLocalDateString(date) === todayLocalDateString();
}

/** Days in a week, for callers laying out a seven-column grid. */
export const LOCAL_DAYS_PER_WEEK = DAYS_PER_WEEK;

/**
 * Shifts a `'YYYY-MM-DD'` string by whole days.
 *
 * Re-exported from `@brnit/datetime` under a neutral name: the underlying
 * helper is spelled `addDaysUTC` because the server reads its inputs as UTC
 * days, but the operation itself is lexical string arithmetic and is equally
 * exact on a locally-derived date string.
 */
export function addCalendarDays(dateStr: string, days: number): string {
	return addDaysUTC(dateStr, days);
}

/** True when `value` is a `'YYYY-MM-DD'` string naming a real calendar day. */
export function isCalendarDateString(value: unknown): value is string {
	return isUtcDateString(value);
}
