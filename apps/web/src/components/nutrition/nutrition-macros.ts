import {
	type FoodUnit,
	getMacroFactor,
	roundNutritionMacro,
} from "@brnit/domain";

/**
 * Macro arithmetic and formatting for the nutrition catalog screens.
 *
 * Everything here uses **`roundNutritionMacro`** — round to nearest, 2dp. These
 * screens show *persisted* figures (`meal.total_*`) and the per-unit columns
 * those totals are recomputed from, so the displayed number has to agree
 * exactly with what the database holds. The member-facing `roundUpToTenth` rule
 * is deliberately not used here, and the two must never be unified — see
 * `@brnit/domain/nutrition-rounding`.
 *
 * Totals are summed **raw** and rounded once at the end, mirroring
 * `computeMealTotalsFromLineItems` on the server; rounding each line first and
 * adding those would drift away from the stored total.
 */

export interface MacroTotals {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
}

/** A meal line: how much of a food whose macros are stored per one unit. */
export interface MacroLineItem {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
	quantity: number;
	unit: FoodUnit;
}

const NO_MACROS: MacroTotals = { calories: 0, carbs: 0, fat: 0, protein: 0 };

/** The rendered form of a macro. */
export function formatMacro(value: number): string {
	return String(roundNutritionMacro(value));
}

/** One per-unit macro scaled to `quantity` of `unit`. */
export function scaleMacro(
	perUnit: number,
	quantity: number,
	unit: FoodUnit
): number {
	return roundNutritionMacro(getMacroFactor(quantity, unit) * perUnit);
}

/**
 * Client-side totals for a set of lines.
 *
 * Only a fallback: the API returns `meal.total_*` computed the same way, and
 * the summary prefers those so the screen and the row never disagree.
 */
export function computeMacroTotals(
	items: readonly MacroLineItem[]
): MacroTotals {
	const raw = items.reduce((accumulator, item) => {
		const factor = getMacroFactor(item.quantity, item.unit);
		return {
			calories: accumulator.calories + factor * item.calories,
			carbs: accumulator.carbs + factor * item.carbs,
			fat: accumulator.fat + factor * item.fat,
			protein: accumulator.protein + factor * item.protein,
		};
	}, NO_MACROS);

	return {
		calories: roundNutritionMacro(raw.calories),
		carbs: roundNutritionMacro(raw.carbs),
		fat: roundNutritionMacro(raw.fat),
		protein: roundNutritionMacro(raw.protein),
	};
}
