import { type FoodUnit, getMacroFactor, roundUpToTenth } from "@brnit/domain";

/**
 * Macro arithmetic for the member read surface.
 *
 * Everything here uses the **round up to the nearest tenth at every step**
 * rule (`roundUpToTenth`), never the 2dp nearest-rounding used for persisted
 * `meal.total_*`. The two rules coexist deliberately — see
 * `@brnit/domain/nutrition-rounding`. A day total can therefore exceed the sum
 * of its raw meals by a few tenths; that is the long-standing behaviour of the
 * member Home screen.
 */

export interface MacrosDto {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
}

/** Per-unit nutrition of a food item, already coerced to finite numbers. */
export interface FoodNutrition {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
}

export const ZERO_MACROS: MacrosDto = {
	calories: 0,
	carbs: 0,
	fat: 0,
	protein: 0,
};

/** Macros for `quantity` of a food, rounded up to the tenth per macro. */
export function macrosForQuantity(
	quantity: number,
	nutrition: FoodNutrition,
	unit: FoodUnit
): MacrosDto {
	const factor = getMacroFactor(quantity, unit);
	return {
		calories: roundUpToTenth(factor * nutrition.calories),
		carbs: roundUpToTenth(factor * nutrition.carbs),
		fat: roundUpToTenth(factor * nutrition.fat),
		protein: roundUpToTenth(factor * nutrition.protein),
	};
}

/**
 * Sums already-computed macros, rounding up at **each** accumulation step.
 * Used for both meal totals (over items) and day totals (over meals).
 */
export function sumMacros(entries: readonly MacrosDto[]): MacrosDto {
	return entries.reduce<MacrosDto>(
		(accumulated, entry) => ({
			calories: roundUpToTenth(accumulated.calories + entry.calories),
			carbs: roundUpToTenth(accumulated.carbs + entry.carbs),
			fat: roundUpToTenth(accumulated.fat + entry.fat),
			protein: roundUpToTenth(accumulated.protein + entry.protein),
		}),
		{ ...ZERO_MACROS }
	);
}
