import { describe, expect, it } from "bun:test";

import {
	computeMealTotalsFromLineItems,
	type FoodUnitForMealTotals,
	getMacroFactor,
	type MealLineForTotals,
	mealMacroTotalsToMealColumns,
	mealTotalsLinesFromDbRows,
	roundNutritionMacro,
} from "./meal-totals";

function line(partial: Partial<MealLineForTotals> = {}): MealLineForTotals {
	return {
		quantity: 1,
		calories: 0,
		protein: 0,
		carbs: 0,
		fat: 0,
		unit: "piece",
		...partial,
	};
}

describe("getMacroFactor", () => {
	it("divides by 100 for the 100g unit, where quantity is grams", () => {
		expect(getMacroFactor(200, "100g")).toBe(2);
		expect(getMacroFactor(50, "100g")).toBe(0.5);
	});

	it("uses the quantity directly for per-unit foods", () => {
		const perUnitUnits: FoodUnitForMealTotals[] = [
			"piece",
			"liters",
			"cup",
			"tbsp",
		];
		for (const unit of perUnitUnits) {
			expect(getMacroFactor(3, unit)).toBe(3);
		}
	});
});

describe("roundNutritionMacro", () => {
	it("rounds to 2 decimals (the persisted meal.total_* precision)", () => {
		expect(roundNutritionMacro(12.3456)).toBe(12.35);
		expect(roundNutritionMacro(12.344)).toBe(12.34);
	});
});

describe("computeMealTotalsFromLineItems", () => {
	it("scales 100g lines by quantity/100", () => {
		const totals = computeMealTotalsFromLineItems([
			line({
				quantity: 200,
				calories: 100,
				protein: 10,
				carbs: 20,
				fat: 5,
				unit: "100g",
			}),
		]);
		expect(totals).toEqual({
			calories: 200,
			protein: 20,
			carbs: 40,
			fat: 10,
		});
	});

	it("uses factor = quantity for non-100g units", () => {
		const totals = computeMealTotalsFromLineItems([
			line({
				quantity: 2,
				calories: 50,
				protein: 5,
				carbs: 8,
				fat: 2,
				unit: "piece",
			}),
		]);
		expect(totals).toEqual({
			calories: 100,
			protein: 10,
			carbs: 16,
			fat: 4,
		});
	});

	it("rounds once at the end, not per line (sub-cent lines still sum)", () => {
		// Each line alone rounds to 0.00 at 2dp. Rounding per line would drop
		// them entirely; rounding the raw sum once keeps 0.012 -> 0.01.
		const totals = computeMealTotalsFromLineItems([
			line({ calories: 0.004, protein: 0.004, carbs: 0.004, fat: 0.004 }),
			line({ calories: 0.004, protein: 0.004, carbs: 0.004, fat: 0.004 }),
			line({ calories: 0.004, protein: 0.004, carbs: 0.004, fat: 0.004 }),
		]);
		expect(totals).toEqual({
			calories: 0.01,
			protein: 0.01,
			carbs: 0.01,
			fat: 0.01,
		});
	});

	it("rounds once at the end, not per line (half-cent lines do not compound)", () => {
		// Per-line rounding would give 0.01 x 3 = 0.03; the raw sum is 0.015 -> 0.02.
		const totals = computeMealTotalsFromLineItems([
			line({ calories: 0.005 }),
			line({ calories: 0.005 }),
			line({ calories: 0.005 }),
		]);
		expect(totals.calories).toBe(0.02);
	});

	it("mixes 100g and per-unit lines in a single sum", () => {
		const totals = computeMealTotalsFromLineItems([
			line({ quantity: 150, calories: 89, unit: "100g" }),
			line({ quantity: 2, calories: 78, unit: "piece" }),
		]);
		// 1.5 * 89 + 2 * 78 = 133.5 + 156
		expect(totals.calories).toBe(289.5);
	});

	it("returns zeros for an empty meal", () => {
		expect(computeMealTotalsFromLineItems([])).toEqual({
			calories: 0,
			protein: 0,
			carbs: 0,
			fat: 0,
		});
	});
});

describe("mealMacroTotalsToMealColumns", () => {
	it("stringifies each macro for the numeric columns", () => {
		expect(
			mealMacroTotalsToMealColumns({
				calories: 289.5,
				protein: 0,
				carbs: 12.34,
				fat: 1,
			})
		).toEqual({
			totalCalories: "289.5",
			totalProtein: "0",
			totalCarbs: "12.34",
			totalFat: "1",
		});
	});
});

describe("mealTotalsLinesFromDbRows", () => {
	it("coerces string numerics and null macros to numbers for summation", () => {
		const lines = mealTotalsLinesFromDbRows([
			{
				quantity: "100",
				calories: "10",
				protein: null,
				carbs: "2",
				fat: "1",
				unit: "100g",
			},
		]);
		expect(computeMealTotalsFromLineItems(lines)).toEqual({
			calories: 10,
			protein: 0,
			carbs: 2,
			fat: 1,
		});
	});

	it("coerces null, empty-string and non-finite numerics to 0", () => {
		const lines = mealTotalsLinesFromDbRows([
			{
				quantity: "",
				calories: null,
				protein: "",
				carbs: "not-a-number",
				fat: "Infinity",
				unit: "piece",
			},
		]);
		expect(lines).toEqual([
			{
				quantity: 0,
				calories: 0,
				protein: 0,
				carbs: 0,
				fat: 0,
				unit: "piece",
			},
		]);
	});

	it("defaults a null unit to 100g, matching the column default", () => {
		const lines = mealTotalsLinesFromDbRows([
			{
				quantity: "200",
				calories: "100",
				protein: "10",
				carbs: "20",
				fat: "5",
				unit: null,
			},
		]);
		expect(lines[0]?.unit).toBe("100g");
		expect(computeMealTotalsFromLineItems(lines).calories).toBe(200);
	});
});
