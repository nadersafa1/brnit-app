import { expandDateRangeInclusive, maxDateString } from "@brnit/datetime";

import type { MealItemOverrideScope } from "./schemas";

/**
 * Turning a member's swap *intent* into the canonical `effective_dates` snapshot
 * (§8.5).
 *
 * The database stores no rules, only days: `diet_plan_meal_item_override`
 * carries a `jsonb` array of `'YYYY-MM-DD'` strings, and resolution is a plain
 * membership test. Everything scope-shaped happens here, at write time.
 */

export interface OverrideScopeWindow {
	scope: MealItemOverrideScope;
	/** Persisted as `intent_start_date`; audit and edit-UX metadata only. */
	startDate: string;
}

export interface OverrideScopeInput {
	scope: MealItemOverrideScope;
	startDate: string;
}

/** Unique, ascending. `'YYYY-MM-DD'` sorts lexicographically into date order. */
export function dedupeAndSortDateStrings(
	dates: readonly string[]
): string[] {
	return [...new Set(dates)].sort((a, b) => a.localeCompare(b));
}

/**
 * Reads an `effective_dates` column defensively.
 *
 * The column is `jsonb` with only a `jsonb_typeof(...) = 'array'` CHECK behind
 * it, so the element type is an application-side promise rather than a database
 * guarantee. Anything that is not a string is dropped.
 */
export function parseEffectiveDates(value: unknown): string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return dedupeAndSortDateStrings(
		value.filter((entry): entry is string => typeof entry === "string")
	);
}

/**
 * Clamps the caller's intent to a window that may be written.
 *
 * `single_day` is taken verbatim and **may be in the past** — correcting what
 * you actually ate yesterday is a legitimate edit. `rest_of_plan` starts no
 * earlier than today, so "from now on" never rewrites days that have already
 * been lived (and possibly already logged as consumed).
 */
export function normalizeOverrideScopeWindow(
	input: OverrideScopeInput,
	todayUtcDate: string
): OverrideScopeWindow {
	if (input.scope === "single_day") {
		return { scope: "single_day", startDate: input.startDate };
	}
	return {
		scope: "rest_of_plan",
		startDate: maxDateString(input.startDate, todayUtcDate),
	};
}

/**
 * The days a window covers, bounded by the assignment's own end date.
 *
 * A `rest_of_plan` window that starts after the assignment ends yields `[]`,
 * which the caller must reject — an override covering no day would be a row that
 * can never resolve.
 */
export function buildEffectiveDatesForScope(
	window: OverrideScopeWindow,
	assignmentEndDate: string
): string[] {
	if (window.scope === "single_day") {
		return [window.startDate];
	}
	if (window.startDate > assignmentEndDate) {
		return [];
	}
	return expandDateRangeInclusive(window.startDate, assignmentEndDate);
}

/**
 * Union of an existing row's days and the incoming ones.
 *
 * Used when the write targets a slot+food pair rather than a specific row: the
 * member picking the same alternative again for one more day must not lose the
 * days that alternative already covered.
 */
export function mergeEffectiveDates(
	existing: readonly string[],
	incoming: readonly string[]
): string[] {
	return dedupeAndSortDateStrings([...existing, ...incoming]);
}

/**
 * Drops one day from a date set.
 *
 * Returns `null` when the day was not in the set, so callers can tell "nothing
 * to remove" (404) from "removed, and the row is now empty" (`[]`, delete the
 * row).
 */
export function removeDateFromEffectiveDates(
	dates: readonly string[],
	date: string
): string[] | null {
	const remaining = dates.filter((entry) => entry !== date);
	return remaining.length === dates.length ? null : remaining;
}

export interface DatedOverrideRow {
	effectiveDates: string[] | null;
	id: string;
}

/**
 * The row a single-day delete should edit: the first one covering `date` in
 * newest-first order, matching the resolution rule that the greatest
 * `updatedAt` wins for a day.
 */
export function findOverrideRowCoveringDate<Row extends DatedOverrideRow>(
	rowsNewestFirst: readonly Row[],
	date: string
): Row | undefined {
	return rowsNewestFirst.find((row) =>
		parseEffectiveDates(row.effectiveDates).includes(date)
	);
}
