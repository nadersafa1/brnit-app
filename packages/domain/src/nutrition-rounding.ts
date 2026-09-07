/**
 * Two rounding rules coexist in brnit, and both are load-bearing. They are
 * defined side by side here so the difference is impossible to miss, and they
 * must **not** be unified.
 */

/** Precision of the persisted macro columns. */
const MACRO_DECIMAL_PLACES = 2;
const MACRO_SCALE = 10 ** MACRO_DECIMAL_PLACES;

/** Precision of every member-facing macro. */
const MACRO_DISPLAY_SCALE = 10;

type NumericInput = string | number | null | undefined;

function parseFiniteNumber(value: NumericInput): number | null {
	if (value == null || value === "") {
		return null;
	}
	const parsed = typeof value === "number" ? value : Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Rule 1 — **round to nearest, 2 decimals**. `Math.round(v * 100) / 100`.
 *
 * Use for values that are *stored* (`meal.total_*`) and for shaping `numeric`
 * columns into API JSON. Nearest-rounding is required here because these
 * numbers are written back to the database and read again: a directional rule
 * would inflate the same meal a little more on every recompute. Two decimals
 * matches the precision the meal summary card has always displayed, so
 * persisted totals and the rendered summary agree exactly.
 *
 * Totals must be summed raw and rounded **once at the end** — see
 * `computeMealTotalsFromLineItems` in `@brnit/db`.
 */
export function roundNutritionMacro(value: number): number {
	return Math.round(value * MACRO_SCALE) / MACRO_SCALE;
}

/** Nullable macro column (Drizzle `numeric` → `string`); `null` stays `null`. */
export function roundNutritionMacroNullable(
	value: NumericInput
): number | null {
	const parsed = parseFiniteNumber(value);
	if (parsed == null) {
		return null;
	}
	return roundNutritionMacro(parsed);
}

/** Required macro (e.g. calories); missing or unparseable is treated as 0. */
export function roundNutritionMacroRequired(value: NumericInput): number {
	const parsed = parseFiniteNumber(value);
	if (parsed == null) {
		return 0;
	}
	return roundNutritionMacro(parsed);
}

/**
 * Rule 2 — **round up, 1 decimal**. `Math.ceil(v * 10) / 10`.
 *
 * Use for everything the member sees: per item, per meal, per day, at *every*
 * step of the sum. Rounding up is deliberate — a member reading their plan
 * should never be told they are eating less than they are, so the displayed
 * figure is an upper bound. It is applied at each aggregation level rather than
 * once at the end, which means a day total can exceed the sum of its raw meals
 * by a few tenths. That is the intended, long-standing behaviour of the member
 * Home screen; do not "fix" it by deferring the rounding.
 *
 * Never use this for anything persisted: repeated ceilings compound upward.
 */
export function roundUpToTenth(value: number): number {
	return Math.ceil(value * MACRO_DISPLAY_SCALE) / MACRO_DISPLAY_SCALE;
}
