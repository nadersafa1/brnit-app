import { getTodayUtcDateString } from "@brnit/datetime";

/**
 * Pure resolution of assignment-level overrides for a single UTC calendar date.
 *
 * Both resolvers are the trickiest read-path logic in the app and both are
 * pure functions of (rows, date), so they live here rather than in a service:
 * the server resolves them per day of the member Home read, and the same rules
 * decide what a consumption snapshot contains.
 */

/**
 * Minimum shape needed to resolve a food swap. Callers pass their own richer
 * row (food name, quantity, …) and get it back out of the map unchanged.
 */
export interface MealItemOverrideSlotRow {
	dietPlanMealId: string;
	/**
	 * Snapshot of the `'YYYY-MM-DD'` dates this override applies to
	 * (`diet_plan_meal_item_override.effective_dates`, a `jsonb` array).
	 * This is the canonical runtime resolver — `intent_scope` /
	 * `intent_start_date` are audit and edit-UX metadata only.
	 */
	effectiveDates: readonly string[];
	mealItemId: string;
	updatedAt: Date;
}

/**
 * The slot an override occupies: one line of one meal within the plan.
 * A slot may have several override rows, one per alternative food, each owning
 * its own set of effective dates.
 */
export function overrideSlotKey(
	dietPlanMealId: string,
	mealItemId: string
): string {
	return `${dietPlanMealId}:${mealItemId}`;
}

/**
 * Which override (if any) is in force for each slot on `date`.
 *
 * Only rows whose `effectiveDates` contain `date` are considered, and among
 * those the **greatest `updatedAt` wins**. That last-write-wins rule is what
 * lets several foods share one slot on different days: the member swapping the
 * same slot again writes a newer row, and the older row keeps serving the days
 * the new one does not cover.
 *
 * Ties (identical `updatedAt`) keep the earlier row in `rows` order, matching
 * the original strict `>` comparison.
 */
export function resolveOverridesForDate<Row extends MealItemOverrideSlotRow>(
	rows: readonly Row[],
	date: string
): Map<string, Row> {
	const resolved = new Map<string, Row>();

	for (const row of rows) {
		if (!row.effectiveDates.includes(date)) {
			continue;
		}
		const slotKey = overrideSlotKey(row.dietPlanMealId, row.mealItemId);
		const current = resolved.get(slotKey);
		if (!current || row.updatedAt.getTime() > current.updatedAt.getTime()) {
			resolved.set(slotKey, row);
		}
	}

	return resolved;
}

/**
 * A row of `diet_plan_meal_time_override`.
 *
 * `effectiveDate === null` means "future only". Postgres unique indexes are
 * NULLS DISTINCT by default, so the unique index on
 * `(assignment, meal, effective_date)` does **not** deduplicate those rows —
 * that is intentional, and the write path deletes them explicitly instead.
 */
export interface MealTimeOverrideRow {
	dietPlanMealId: string;
	effectiveDate: string | null;
	scheduledTime: string;
}

/**
 * Effective meal times for `date`, keyed by `dietPlanMealId`.
 *
 * Precedence per meal:
 * 1. a row whose `effectiveDate` is exactly `date`;
 * 2. otherwise a future-only row (`effectiveDate === null`), but only when
 *    `date >= today` — a future-only change must not rewrite history;
 * 3. otherwise no entry, and the caller falls back to the plan slot's own
 *    `scheduledTime`.
 *
 * `today` is injectable so the rule stays a pure function; it defaults to the
 * real UTC today because that is what every production call site means.
 */
export function resolveMealTimeOverridesForDate(
	rows: readonly MealTimeOverrideRow[],
	date: string,
	today: string = getTodayUtcDateString()
): Map<string, string> {
	const exactMatches = new Map<string, string>();
	const futureOnlyMatches = new Map<string, string>();

	for (const row of rows) {
		if (row.effectiveDate === date) {
			if (!exactMatches.has(row.dietPlanMealId)) {
				exactMatches.set(row.dietPlanMealId, row.scheduledTime);
			}
		} else if (
			row.effectiveDate === null &&
			!futureOnlyMatches.has(row.dietPlanMealId)
		) {
			futureOnlyMatches.set(row.dietPlanMealId, row.scheduledTime);
		}
	}

	const resolved = new Map(exactMatches);

	if (date >= today) {
		for (const [dietPlanMealId, scheduledTime] of futureOnlyMatches) {
			if (!resolved.has(dietPlanMealId)) {
				resolved.set(dietPlanMealId, scheduledTime);
			}
		}
	}

	return resolved;
}
