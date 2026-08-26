import type { FoodUnit } from "@brnit/domain";

/**
 * How a food unit reads on screen.
 *
 * Only presentation lives here. The quantity **rules** — step, minimum and
 * snapping — are `mealQuantityStep`, `mealQuantityMin` and
 * `snapMealQuantityToStep` in `@brnit/domain`, shared with the server's
 * alternatives endpoint and the native app. They were duplicated in this app
 * before the overhaul; import them, never re-derive them.
 */

const UNIT_LABEL: Record<FoodUnit, string> = {
	"100g": "100g",
	piece: "piece",
	liters: "L",
	cup: "cup",
	tbsp: "tbsp",
};

const UNIT_DESCRIPTION: Record<FoodUnit, string> = {
	"100g": "100g (per 100 grams)",
	piece: "Piece (per 1 item)",
	liters: "Litre (per 1 L)",
	cup: "Cup (per 1 cup)",
	tbsp: "Tbsp (per 1 tablespoon)",
};

const GRAMS_PER_UNIT_PLACEHOLDER: Record<FoodUnit, string> = {
	"100g": "e.g. 50",
	piece: "e.g. 50 for one egg",
	liters: "e.g. 1030 for milk density",
	cup: "e.g. 240 for a US cup",
	tbsp: "e.g. 15 for 1 tbsp",
};

/** Short label for tables and detail rows. */
export function formatFoodUnitLabel(unit: FoodUnit | null | undefined): string {
	return unit == null ? "–" : UNIT_LABEL[unit];
}

/** Long label for the unit picker, spelling out what "1 unit" means. */
export function formatFoodUnitDescription(unit: FoodUnit): string {
	return UNIT_DESCRIPTION[unit];
}

export function gramsPerUnitPlaceholder(unit: FoodUnit): string {
	return GRAMS_PER_UNIT_PLACEHOLDER[unit];
}

function compactQuantity(quantity: number): string {
	return Number.isInteger(quantity)
		? String(quantity)
		: String(Math.round(quantity * 1000) / 1000);
}

/** Readable quantity, e.g. `150 g`, `2 pcs`, `0.5L`, `1 cup`. */
export function formatMealQuantityWithUnit(
	quantity: number,
	unit: FoodUnit
): string {
	switch (unit) {
		case "100g":
			return `${compactQuantity(quantity)} g`;
		case "piece":
			return `${compactQuantity(quantity)} pcs`;
		case "liters":
			return `${compactQuantity(quantity)}L`;
		case "cup":
			return `${compactQuantity(quantity)} cup${quantity === 1 ? "" : "s"}`;
		default:
			return `${compactQuantity(quantity)} tbsp`;
	}
}
