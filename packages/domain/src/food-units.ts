/**
 * Food units and the quantity semantics that hang off them.
 *
 * Mirrors the `food_item_unit` Postgres enum. **Declaration order matters** —
 * Postgres orders enum values by their declaration position, so any query that
 * sorts by `food_item.unit` depends on this exact sequence. The enum was created
 * with `('100g','piece')`, gained `'liters'`, then `'cup'` and `'tbsp'`; new
 * units must be appended, never inserted.
 */

export const FOOD_UNITS = ["100g", "piece", "liters", "cup", "tbsp"] as const;

export type FoodUnit = (typeof FOOD_UNITS)[number];

/** Column default on `food_item.unit`, and the fallback for a missing unit. */
export const DEFAULT_FOOD_UNIT = "100g" as const satisfies FoodUnit;

/** Assumed grams per unit when `food_item.grams_per_unit` is null. */
export const DEFAULT_GRAMS_PER_UNIT = 100;

const GRAMS_PER_HUNDRED_GRAM_UNIT = 100;

export function isFoodUnit(value: unknown): value is FoodUnit {
	return (
		typeof value === "string" &&
		(FOOD_UNITS as readonly string[]).includes(value)
	);
}

/**
 * Macros on `food_item` are always stored **per 1 unit**. What "1 unit" means,
 * and therefore what `quantity` counts, depends on the unit:
 *
 * - `100g` — macros are per 100 g and `quantity` is a number of **grams**, so
 *   the multiplier is `quantity / 100`.
 * - everything else — macros are per 1 piece / litre / cup / tbsp and
 *   `quantity` is a **count of those units**, so the multiplier is `quantity`.
 *
 * Every macro computation in the app funnels through this one rule.
 */
export function getMacroFactor(quantity: number, unit: FoodUnit): number {
	return unit === DEFAULT_FOOD_UNIT
		? quantity / GRAMS_PER_HUNDRED_GRAM_UNIT
		: quantity;
}

/**
 * Gram equivalence for a quantity, used to compare foods measured in different
 * units (the alternatives endpoint).
 *
 * For `100g` the quantity is already grams. Otherwise it is
 * `quantity * gramsPerUnit`, falling back to {@link DEFAULT_GRAMS_PER_UNIT} when
 * the column is null or unparseable — `grams_per_unit` is a nullable bare
 * `numeric`, which Drizzle surfaces as a `string`, so both forms are accepted.
 */
export function toEquivalentGrams(
	quantity: number,
	unit: FoodUnit,
	gramsPerUnit: number | string | null | undefined
): number {
	if (unit === DEFAULT_FOOD_UNIT) {
		return quantity;
	}
	const parsed = Number(gramsPerUnit);
	const gpu =
		gramsPerUnit != null && Number.isFinite(parsed)
			? parsed
			: DEFAULT_GRAMS_PER_UNIT;
	return quantity * gpu;
}

/**
 * Quantity increment offered in the UI and used to round the alternatives
 * endpoint's `suggestedQuantity`. Grams move in 50 g steps, pieces are whole,
 * and volume measures go in halves.
 */
const MEAL_QUANTITY_STEP_BY_UNIT: Record<FoodUnit, number> = {
	"100g": 50,
	piece: 1,
	liters: 0.5,
	cup: 0.5,
	tbsp: 0.5,
};

export function mealQuantityStep(unit: FoodUnit): number {
	return MEAL_QUANTITY_STEP_BY_UNIT[unit];
}

/** Smallest valid positive quantity, aligned with the step (HTML `min`). */
export function mealQuantityMin(unit: FoodUnit): number {
	return mealQuantityStep(unit);
}

function decimalPlacesForStep(step: number): number {
	if (step % 1 === 0) {
		return 0;
	}
	return String(step).split(".")[1]?.length ?? 1;
}

/**
 * Snaps a raw quantity onto the unit's step: nearest step, rounded to the
 * step's own decimal precision (so 0.5 steps never produce float dust), then
 * clamped up to `mealQuantityMin(unit)` so a suggestion is never zero or
 * negative.
 *
 * Non-finite input is clamped to the minimum rather than snapped.
 */
export function snapMealQuantityToStep(
	quantity: number,
	unit: FoodUnit
): number {
	const step = mealQuantityStep(unit);
	const min = mealQuantityMin(unit);
	if (step <= 0 || !Number.isFinite(quantity)) {
		return Math.max(quantity, min);
	}
	const snapped = Math.round(quantity / step) * step;
	const decimals = decimalPlacesForStep(step);
	const rounded = Math.round(snapped * 10 ** decimals) / 10 ** decimals;
	return Math.max(min, rounded);
}
