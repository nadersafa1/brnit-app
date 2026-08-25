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

const MACRO_DECIMAL_PLACES = 2;
const MACRO_SCALE = 10 ** MACRO_DECIMAL_PLACES;

/** Mirrors the `food_item_unit` pg enum. Kept local so `@brnit/db` has no domain dependency. */
export type FoodUnitForMealTotals = "100g" | "piece" | "liters" | "cup" | "tbsp";

export type MealLineForTotals = {
	quantity: number;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	unit: FoodUnitForMealTotals;
};

/** Output of {@link computeMealTotalsFromLineItems}; maps 1:1 to `meal` numeric columns. */
export type MealMacroTotals = {
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
};

/**
 * `100g` stores macros per 100 g and `quantity` in grams, so the factor is
 * `quantity / 100`. Every other unit stores macros per 1 unit and `quantity` as
 * a count of units, so the factor is the quantity itself.
 */
export function getMacroFactor(
	quantity: number,
	unit: FoodUnitForMealTotals
): number {
	return unit === "100g" ? quantity / 100 : quantity;
}

/** Rounds to 2 decimals — the precision of the persisted `meal.total_*` columns. */
export function roundNutritionMacro(value: number): number {
	return Math.round(value * MACRO_SCALE) / MACRO_SCALE;
}

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
