import type { FoodUnit } from "@brnit/domain";

/**
 * Number → string formatting for macros and quantities.
 *
 * The arithmetic itself lives in `@brnit/domain`: `roundUpToTenth` for anything
 * a member reads, `getMacroFactor` / `toEquivalentGrams` for unit conversion,
 * `snapMealQuantityToStep` for quantity inputs. This module only turns an
 * already-rounded number into the text on screen.
 */

const GRAM_DISPLAY_SCALE = 10;
const VOLUME_DISPLAY_SCALE = 1000;
const DECIMAL_PLACES = 1;

/** A whole number stays whole; anything else keeps one decimal. */
export function formatCalorieDisplay(value: number): string {
	return value % 1 === 0 ? String(value) : value.toFixed(DECIMAL_PLACES);
}

function trimToScale(value: number, scale: number): string {
	return String(Math.round(value * scale) / scale);
}

function pluralize(count: number, singular: string): string {
	return count === 1 ? singular : `${singular}s`;
}

/** `"150g"`, `"2 pieces"`, `"0.5L"`, `"1 cup"`, `"1.5 tbsp"`. */
export function formatQuantityWithUnit(
	quantity: number,
	unit: FoodUnit
): string {
	const isWhole = quantity % 1 === 0;

	if (unit === "100g") {
		const grams = isWhole
			? String(quantity)
			: trimToScale(quantity, GRAM_DISPLAY_SCALE);
		return `${grams}g`;
	}
	if (unit === "liters") {
		const liters = isWhole
			? String(quantity)
			: quantity.toFixed(DECIMAL_PLACES);
		return `${liters}L`;
	}
	if (unit === "cup") {
		const cups = isWhole
			? String(quantity)
			: trimToScale(quantity, VOLUME_DISPLAY_SCALE);
		return `${cups} ${pluralize(quantity, "cup")}`;
	}
	if (unit === "tbsp") {
		const spoons = isWhole
			? String(quantity)
			: trimToScale(quantity, VOLUME_DISPLAY_SCALE);
		return `${spoons} tbsp`;
	}
	const pieces = isWhole ? String(quantity) : quantity.toFixed(DECIMAL_PLACES);
	return `${pieces} ${pluralize(quantity, "piece")}`;
}
