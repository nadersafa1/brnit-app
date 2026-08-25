import { DateTime } from "luxon";

/**
 * UTC calendar dates as `'YYYY-MM-DD'` strings — the server's date interchange
 * type, end to end.
 *
 * Why strings and not `Date` / luxon `DateTime`: every `date` column in the
 * schema (`diet_plan_assignment.start_date`/`end_date`,
 * `diet_plan_meal_consumption.consumed_date`,
 * `diet_plan_meal_item_override.intent_start_date`,
 * `diet_plan_meal_time_override.effective_date`, `user.dob`) is read by Drizzle
 * as a `'YYYY-MM-DD'` string, and `diet_plan_meal_item_override.effective_dates`
 * is a `jsonb` array of them. Keeping the string form means override resolution,
 * range expansion and consumption lookups are plain lexicographic comparisons
 * against values that round-trip to the database unchanged. Converting to a
 * date object at any boundary reintroduces the timezone bugs this module exists
 * to prevent.
 *
 * Everything here is UTC. There is no local-time variant on purpose: the API
 * computes calendar days in UTC, and the clients are responsible for their own
 * display timezone.
 */

/** Luxon format token for the interchange string. */
export const UTC_DATE_FORMAT = "yyyy-MM-dd";

/**
 * A UTC calendar date, `'YYYY-MM-DD'`. A plain alias, not a branded type, so it
 * stays assignable from the raw `string`s Drizzle hands back.
 */
export type UtcDateString = string;

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const UTC_ZONE_OPTIONS = { zone: "utc" } as const;

/** True when `value` is a `'YYYY-MM-DD'` string naming a real calendar day. */
export function isUtcDateString(value: unknown): value is UtcDateString {
	if (typeof value !== "string" || !UTC_DATE_PATTERN.test(value)) {
		return false;
	}
	return DateTime.fromFormat(value, UTC_DATE_FORMAT, UTC_ZONE_OPTIONS).isValid;
}

/** Parses a `'YYYY-MM-DD'` string to UTC midnight, throwing on anything else. */
function parseUtcDateString(dateStr: UtcDateString): DateTime {
	if (!UTC_DATE_PATTERN.test(dateStr)) {
		throw new Error(
			`Expected a YYYY-MM-DD date string, received: ${JSON.stringify(dateStr)}`
		);
	}
	const parsed = DateTime.fromFormat(
		dateStr,
		UTC_DATE_FORMAT,
		UTC_ZONE_OPTIONS
	);
	if (!parsed.isValid) {
		throw new Error(`Not a real calendar date: ${dateStr}`);
	}
	return parsed;
}

/**
 * The UTC calendar day an instant falls on.
 *
 * Accepts a `Date` or any ISO string. An ISO string carrying an offset is
 * converted to UTC first, so `'2026-04-08T23:00:00+02:00'` is `'2026-04-08'`
 * (21:00 UTC).
 *
 * Note one deliberate change from the helper this replaces: an ISO string with
 * a time but *no* offset (`'2026-04-08T23:30:00'`) is read as UTC rather than as
 * the host machine's local time, so the result no longer depends on the server's
 * `TZ`. Invalid input throws instead of silently producing `'NaN-NaN-NaN'`.
 */
export function toDateStringUTC(input: UtcDateString | Date): UtcDateString {
	const dateTime =
		input instanceof Date
			? DateTime.fromJSDate(input, UTC_ZONE_OPTIONS)
			: DateTime.fromISO(input, UTC_ZONE_OPTIONS);

	if (!dateTime.isValid) {
		throw new Error(
			`Cannot read a UTC date from: ${JSON.stringify(input instanceof Date ? input.toString() : input)}`
		);
	}

	return dateTime.toFormat(UTC_DATE_FORMAT);
}

/**
 * Shifts a UTC calendar date by whole days. `days` may be negative.
 *
 * UTC has no DST, so this is exact across every clock-change boundary: the
 * result is always the neighbouring calendar day, never 23 or 25 hours later.
 */
export function addDaysUTC(
	dateStr: UtcDateString,
	days: number
): UtcDateString {
	return parseUtcDateString(dateStr).plus({ days }).toFormat(UTC_DATE_FORMAT);
}

/** Today's UTC calendar date. The server's definition of "today", everywhere. */
export function getTodayUtcDateString(): UtcDateString {
	return DateTime.utc().toFormat(UTC_DATE_FORMAT);
}

/**
 * The later of two date strings.
 *
 * `'YYYY-MM-DD'` is fixed-width and zero-padded, so lexicographic order is
 * chronological order — no parsing needed. Used by `rest_of_plan` override
 * scoping, which must never backdate below today.
 */
export function maxDateString(
	a: UtcDateString,
	b: UtcDateString
): UtcDateString {
	return a >= b ? a : b;
}

/** The earlier of two date strings. Same lexicographic property as {@link maxDateString}. */
export function minDateString(
	a: UtcDateString,
	b: UtcDateString
): UtcDateString {
	return a <= b ? a : b;
}

/**
 * Inclusive day count between two UTC calendar dates: the same date counts as
 * `1`, consecutive dates as `2`.
 *
 * This is the plan-day number in the member Home read — day 1 is the
 * assignment's `startDate` — so the inclusive `+1` is part of the contract.
 * Returns a negative-leaning count when `to` precedes `from`.
 */
export function diffDaysInclusiveUTC(
	from: UtcDateString,
	to: UtcDateString
): number {
	const start = parseUtcDateString(from);
	const end = parseUtcDateString(to);
	return end.diff(start, "days").days + 1;
}

/**
 * Every UTC calendar date in `[from..to]`, inclusive of both ends, ascending.
 *
 * Returns `[]` when `to` precedes `from` — callers (override date expansion,
 * the Home read's date window) treat an empty range as "nothing applies" rather
 * than as an error.
 */
export function expandDateRangeInclusive(
	from: UtcDateString,
	to: UtcDateString
): UtcDateString[] {
	const end = parseUtcDateString(to);
	const dates: UtcDateString[] = [];

	for (
		let cursor = parseUtcDateString(from);
		cursor <= end;
		cursor = cursor.plus({ days: 1 })
	) {
		dates.push(cursor.toFormat(UTC_DATE_FORMAT));
	}

	return dates;
}
