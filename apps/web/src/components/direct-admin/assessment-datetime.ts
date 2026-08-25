/**
 * `assessedAt` is an ISO **instant**, not one of the `'YYYY-MM-DD'` calendar
 * dates `@brnit/datetime` owns, so nothing there covers the time component.
 *
 * Every conversion below goes through explicit numeric parts rather than
 * `new Date(someString)`. Engine string-parsing is exactly what makes
 * `new Date('2026-04-08')` UTC midnight while `new Date('2026-04-08T00:00')` is
 * local — the ambiguity this app exists to avoid. `new Date(y, m, d, …)` and
 * `new Date(epochMs)` are unambiguous, so they are what the helpers use.
 *
 * The control is a native `datetime-local`, whose value is the user's **local**
 * wall clock with no zone (`'YYYY-MM-DDTHH:mm'`). That is the timezone the old
 * screens recorded in, and it is preserved here: what the operator types is the
 * instant that gets stored.
 */

/** `'YYYY-MM-DDTHH:mm'`, optionally with the seconds some browsers append. */
const DATETIME_LOCAL_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/;

/** What `Date#toISOString()` produces — the only form the API sends. */
const ISO_INSTANT_PATTERN =
	/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

const MONTH_OFFSET = 1;
const PAD_LENGTH = 2;

function pad(value: number): string {
	return String(value).padStart(PAD_LENGTH, "0");
}

/**
 * The instant an ISO string names, or `null` when it is not one.
 *
 * A `null` is never a hard failure: the edit form leaves its date field blank
 * (blank means "leave it alone") and the table prints a dash.
 */
export function parseAssessedAt(iso: string): Date | null {
	const match = ISO_INSTANT_PATTERN.exec(iso);
	if (!match) {
		return null;
	}
	const [, year, month, day, hour, minute, second, milli] = match;
	const epochMs = Date.UTC(
		Number(year),
		Number(month) - MONTH_OFFSET,
		Number(day),
		Number(hour),
		Number(minute),
		Number(second),
		Number((milli ?? "0").padEnd(3, "0"))
	);
	return new Date(epochMs);
}

/**
 * A `datetime-local` value as an ISO instant.
 *
 * Anything that is not a well-formed control value is passed through untouched
 * so the schema — the server's own `z.iso.datetime()` — is the one that rejects
 * it, rather than this returning a plausible-looking wrong answer.
 */
export function assessedAtInputToIso(value: string): string {
	const match = DATETIME_LOCAL_PATTERN.exec(value);
	if (!match) {
		return value;
	}
	const [, year, month, day, hour, minute] = match;
	const local = new Date(
		Number(year),
		Number(month) - MONTH_OFFSET,
		Number(day),
		Number(hour),
		Number(minute)
	);
	return local.toISOString();
}

/** The `datetime-local` value for an instant, in the viewer's timezone. */
export function isoToAssessedAtInput(iso: string): string {
	const instant = parseAssessedAt(iso);
	if (!instant) {
		return "";
	}
	return `${instant.getFullYear()}-${pad(instant.getMonth() + MONTH_OFFSET)}-${pad(instant.getDate())}T${pad(instant.getHours())}:${pad(instant.getMinutes())}`;
}

/** "Now", ready for a `datetime-local` control. */
export function nowAssessedAtInput(): string {
	const now = new Date();
	return `${now.getFullYear()}-${pad(now.getMonth() + MONTH_OFFSET)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const EM_DASH = "—";

/** An instant for display, in the viewer's locale and timezone. */
export function formatAssessedAt(iso: string): string {
	const instant = parseAssessedAt(iso);
	return instant ? instant.toLocaleString() : EM_DASH;
}
