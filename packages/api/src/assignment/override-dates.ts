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

/**
 * What a swap write should do to the database.
 *
 * Pulling the decision out of the transaction keeps the three-way rule of §8.5
 * — replace, merge, or insert — a pure function of what was read, so it can be
 * reasoned about (and tested) without a database.
 */
export type OverrideWritePlan =
	| { effectiveDates: string[]; id: string; kind: "merge" }
	| { effectiveDates: string[]; id: string; kind: "replace" }
	| { effectiveDates: string[]; kind: "insert" };

export interface OverrideWritePlanInput {
	/** Days the caller's scope resolved to. */
	effectiveDates: string[];
	/** The slot's existing row for the *same food*, when there is one. */
	existingForFood?: DatedOverrideRow | null;
	/** The row the caller named with `overrideId`, when they named one. */
	targetedRow?: DatedOverrideRow | null;
}

/**
 * - A **targeted** edit (`overrideId`) *replaces* the row's dates: the member is
 *   editing an alternative they can see, so their new window is authoritative.
 * - An **untargeted** write onto an existing slot+food row *merges*: the member
 *   asked for "this food on this day" without knowing the row exists, and
 *   replacing would silently un-swap the days it already covered.
 * - Otherwise, **insert**.
 */
export function planOverrideWrite(
	input: OverrideWritePlanInput
): OverrideWritePlan {
	if (input.targetedRow) {
		return {
			effectiveDates: dedupeAndSortDateStrings(input.effectiveDates),
			id: input.targetedRow.id,
			kind: "replace",
		};
	}
	if (input.existingForFood) {
		return {
			effectiveDates: mergeEffectiveDates(
				parseEffectiveDates(input.existingForFood.effectiveDates),
				input.effectiveDates
			),
			id: input.existingForFood.id,
			kind: "merge",
		};
	}
	return {
		effectiveDates: dedupeAndSortDateStrings(input.effectiveDates),
		kind: "insert",
	};
}

/**
 * What removing one day from a slot should do: shrink a row, or delete it once
 * it covers nothing. `null` means no row covered the day — a 404.
 */
export type OverrideDateRemovalPlan =
	| { effectiveDates: string[]; id: string; kind: "shrink" }
	| { id: string; kind: "delete-row" };

export function planOverrideDateRemoval(
	rowsNewestFirst: readonly DatedOverrideRow[],
	date: string
): OverrideDateRemovalPlan | null {
	const target = findOverrideRowCoveringDate(rowsNewestFirst, date);
	if (!target) {
		return null;
	}

	const remaining = removeDateFromEffectiveDates(
		parseEffectiveDates(target.effectiveDates),
		date
	);
	if (remaining === null) {
		return null;
	}
	if (remaining.length === 0) {
		return { id: target.id, kind: "delete-row" };
	}
	return { effectiveDates: remaining, id: target.id, kind: "shrink" };
}
