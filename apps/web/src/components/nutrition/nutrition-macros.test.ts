import { describe, expect, it } from "bun:test";

import {
	computeMacroTotals,
	formatMacro,
	type MacroLineItem,
	scaleMacro,
} from "./nutrition-macros";

/**
 * These screens show *persisted* macros, so they round to nearest at 2dp. The
 * member-facing rule rounds **up** to a tenth, and mixing the two would make a
 * meal's summary disagree with the row stored for it — the assertions below are
 * written to fail loudly if the wrong helper is ever swapped in.
 */

function line(overrides: Partial<MacroLineItem>): MacroLineItem {
	return {
		calories: 0,
		carbs: 0,
		fat: 0,
		protein: 0,
		quantity: 0,
		unit: "100g",
		...overrides,
	};
}

describe("formatMacro", () => {
	it("rounds to two decimals, to nearest", () => {
		expect(formatMacro(12.344)).toBe("12.34");
		expect(formatMacro(12.346)).toBe("12.35");
	});

	it("keeps a hundredth instead of rounding up to a tenth", () => {
		// `roundUpToTenth` would answer "10.2" here. That rule is member-facing
		// only and must not leak onto the catalog screens.
		expect(formatMacro(10.11)).toBe("10.11");
	});

	it("leaves a whole number alone", () => {
		expect(formatMacro(180)).toBe("180");
	});
});

describe("scaleMacro", () => {
	it("treats a 100g quantity as grams", () => {
		expect(scaleMacro(50, 150, "100g")).toBe(75);
	});

	it("treats every other unit as a count of units", () => {
		expect(scaleMacro(80, 2, "piece")).toBe(160);
		expect(scaleMacro(9, 0.5, "tbsp")).toBe(4.5);
	});
});

describe("computeMacroTotals", () => {
	it("sums the raw lines and rounds once at the end", () => {
		// Each line is 0.005 kcal. Rounding per line first would give 0.02;
		// rounding the raw sum gives 0.01, which is what the server stores.
		const totals = computeMacroTotals([
			line({ calories: 1, quantity: 0.5 }),
			line({ calories: 1, quantity: 0.5 }),
		]);

		expect(totals.calories).toBe(0.01);
	});

	it("scales every macro by the line's own unit", () => {
		const totals = computeMacroTotals([
			line({ calories: 100, carbs: 10, fat: 2, protein: 5, quantity: 200 }),
			line({
				calories: 80,
				carbs: 1,
				fat: 6,
				protein: 7,
				quantity: 2,
				unit: "piece",
			}),
		]);

		expect(totals).toEqual({
			calories: 360,
			carbs: 22,
			fat: 16,
			protein: 24,
		});
	});

	it("answers zeroes for a meal with no lines", () => {
		expect(computeMacroTotals([])).toEqual({
			calories: 0,
			carbs: 0,
			fat: 0,
			protein: 0,
		});
	});
});
