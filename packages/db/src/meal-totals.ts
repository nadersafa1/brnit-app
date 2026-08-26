/**
 * Pure meal macro math for the persisted `meal.total_*` columns and the UI
 * summary card that renders them. No DB access — call sites pass rows in.
 *
 * Algorithm: per line, scale the stored per-unit macros by quantity and the
 * food's `unit`, sum the raw floats, then round each of the four macros
 * **exactly once at the end** to 2 decimals.
 *
 * The arithmetic here is load-bearing and must not be "cleaned up":
 * - Rounding per line instead of once at the end changes the stored totals and
 *   breaks parity with the meal summary card that reads them back.
 * - 2 decimals is the *persisted* precision. Everything the member sees rounds
 *   **up to the nearest tenth** instead (`roundUpToTenth` in `@brnit/domain`).
 *   The two rules are different on purpose; do not unify them.
 *
 * `recomputeMealTotals(tx, mealId)` in the API package must run inside the same
 * transaction as any `meal_item` mutation, or `meal.total_*` silently drifts.
 */

import {
	type FoodUnit,
	getMacroFactor,
	roundNutritionMacro,
} from "@brnit/domain";

/**
 * The unit union and the two scaling rules come from `@brnit/domain` rather
 * than being redeclared here. They were duplicated once, and a divergence
 * between the copy used to persist `meal.total_*` and the copy used to render
 * it is exactly the drift this module exists to prevent.
 */
export type FoodUnitForMealTotals = FoodUnit;

export interface MealLineForTotals {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
	quantity: number;
	unit: FoodUnitForMealTotals;
}

/** Output of {@link computeMealTotalsFromLineItems}; maps 1:1 to `meal` numeric columns. */
export interface MealMacroTotals {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
}

export { getMacroFactor, roundNutritionMacro };

/**
 * Same algorithm as the meal detail nutrition summary: scale each line by
 * quantity/unit, sum raw totals, then round each macro once.
 */
export function computeMealTotalsFromLineItems(
	items: MealLineForTotals[]
): MealMacroTotals {
	const rawTotals = items.reduce(
		(acc, mi) => {
			const factor = getMacroFactor(mi.quantity, mi.unit);
			return {
				calories: acc.calories + factor * mi.calories,
				protein: acc.protein + factor * mi.protein,
				carbs: acc.carbs + factor * mi.carbs,
				fat: acc.fat + factor * mi.fat,
			};
		},
		{ calories: 0, protein: 0, carbs: 0, fat: 0 }
	);
	return {
		calories: roundNutritionMacro(rawTotals.calories),
		protein: roundNutritionMacro(rawTotals.protein),
		carbs: roundNutritionMacro(rawTotals.carbs),
		fat: roundNutritionMacro(rawTotals.fat),
	};
}

/**
 * Stringify totals for Drizzle `meal` updates. The `total_*` columns are bare
 * `numeric`, which Drizzle maps to `string`, and Postgres accepts string
 * literals for `numeric` without the float round-trip.
 */
export function mealMacroTotalsToMealColumns(totals: MealMacroTotals) {
	return {
		totalCalories: String(totals.calories),
		totalProtein: String(totals.protein),
		totalCarbs: String(totals.carbs),
		totalFat: String(totals.fat),
	};
}

function toFiniteNumber(v: string | null | undefined): number {
	if (v == null || v === "") {
		return 0;
	}
	const n = Number(v);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Map DB join rows (`meal_item` + `food_item` numerics, which Drizzle surfaces
 * as strings) into lines for {@link computeMealTotalsFromLineItems}.
 * `null` / `''` / non-finite macros coerce to `0`; a null `unit` defaults to
 * `'100g'`, matching the column default.
 */
export function mealTotalsLinesFromDbRows(
	rows: Array<{
		quantity: string;
		calories: string | null;
		protein: string | null;
		carbs: string | null;
		fat: string | null;
		unit: FoodUnitForMealTotals | null;
	}>
): MealLineForTotals[] {
	return rows.map((r) => {
		const unit: FoodUnitForMealTotals = r.unit ?? "100g";
		return {
			quantity: toFiniteNumber(r.quantity),
			calories: toFiniteNumber(r.calories),
			protein: toFiniteNumber(r.protein),
			carbs: toFiniteNumber(r.carbs),
			fat: toFiniteNumber(r.fat),
			unit,
		};
	});
}
