import { describe, expect, it } from "bun:test";

import {
	DEFAULT_FOOD_UNIT,
	DEFAULT_GRAMS_PER_UNIT,
	FOOD_UNITS,
	type FoodUnit,
	getMacroFactor,
	isFoodUnit,
	mealQuantityMin,
	mealQuantityStep,
	snapMealQuantityToStep,
	toEquivalentGrams,
} from "./food-units";

const PER_UNIT_FOOD_UNITS: FoodUnit[] = ["piece", "liters", "cup", "tbsp"];

describe("FOOD_UNITS", () => {
	it("matches the pg enum, in declaration order", () => {
		expect(FOOD_UNITS).toEqual(["100g", "piece", "liters", "cup", "tbsp"]);
		expect(DEFAULT_FOOD_UNIT).toBe("100g");
	});
});

describe("isFoodUnit", () => {
	it("accepts every declared unit and nothing else", () => {
		for (const unit of FOOD_UNITS) {
			expect(isFoodUnit(unit)).toBe(true);
		}
		expect(isFoodUnit("grams")).toBe(false);
		expect(isFoodUnit("L")).toBe(false);
		expect(isFoodUnit(null)).toBe(false);
		expect(isFoodUnit(100)).toBe(false);
	});
});

describe("getMacroFactor", () => {
	it("treats 100g quantities as grams", () => {
		expect(getMacroFactor(100, "100g")).toBe(1);
		expect(getMacroFactor(250, "100g")).toBe(2.5);
		expect(getMacroFactor(0, "100g")).toBe(0);
	});

	it("treats every other unit's quantity as a count of units", () => {
		for (const unit of PER_UNIT_FOOD_UNITS) {
			expect(getMacroFactor(2, unit)).toBe(2);
			expect(getMacroFactor(0.5, unit)).toBe(0.5);
		}
	});
});

describe("toEquivalentGrams", () => {
	it("returns the quantity unchanged for 100g", () => {
		expect(toEquivalentGrams(150, "100g", null)).toBe(150);
		expect(toEquivalentGrams(150, "100g", 999)).toBe(150);
	});

	it("multiplies by gramsPerUnit for the other units", () => {
		expect(toEquivalentGrams(2, "piece", 50)).toBe(100);
		expect(toEquivalentGrams(1, "liters", 1030)).toBe(1030);
		expect(toEquivalentGrams(2, "tbsp", 15)).toBe(30);
	});

	it("accepts the numeric string Drizzle returns for grams_per_unit", () => {
		expect(toEquivalentGrams(2, "cup", "240")).toBe(480);
	});

	it("falls back to 100 g per unit when the column is null or unusable", () => {
		expect(toEquivalentGrams(2, "piece", null)).toBe(
			2 * DEFAULT_GRAMS_PER_UNIT
		);
		expect(toEquivalentGrams(2, "piece", undefined)).toBe(200);
		expect(toEquivalentGrams(2, "piece", "not-a-number")).toBe(200);
	});
});

describe("mealQuantityStep / mealQuantityMin", () => {
	it("uses 50 g, whole pieces and half units", () => {
		expect(mealQuantityStep("100g")).toBe(50);
		expect(mealQuantityStep("piece")).toBe(1);
		expect(mealQuantityStep("liters")).toBe(0.5);
		expect(mealQuantityStep("cup")).toBe(0.5);
		expect(mealQuantityStep("tbsp")).toBe(0.5);
	});

	it("sets the minimum equal to the step for every unit", () => {
		for (const unit of FOOD_UNITS) {
			expect(mealQuantityMin(unit)).toBe(mealQuantityStep(unit));
		}
	});
});

describe("snapMealQuantityToStep", () => {
	it("snaps 100g to 50 g increments", () => {
		expect(snapMealQuantityToStep(150, "100g")).toBe(150);
		expect(snapMealQuantityToStep(175, "100g")).toBe(200);
		expect(snapMealQuantityToStep(174, "100g")).toBe(150);
	});

	it("snaps pieces to whole numbers", () => {
		expect(snapMealQuantityToStep(2.2, "piece")).toBe(2);
		expect(snapMealQuantityToStep(2.6, "piece")).toBe(3);
	});

	it("snaps volume units to halves without float dust", () => {
		expect(snapMealQuantityToStep(0.7, "liters")).toBe(0.5);
		expect(snapMealQuantityToStep(0.9, "liters")).toBe(1);
		expect(snapMealQuantityToStep(1.25, "cup")).toBe(1.5);
		expect(snapMealQuantityToStep(2.3, "tbsp")).toBe(2.5);
	});

	it("clamps up to the minimum so a suggestion is never zero", () => {
		expect(snapMealQuantityToStep(12, "100g")).toBe(50);
		expect(snapMealQuantityToStep(0, "100g")).toBe(50);
		expect(snapMealQuantityToStep(0.3, "piece")).toBe(1);
		expect(snapMealQuantityToStep(-5, "liters")).toBe(0.5);
	});

	it("passes non-finite input through the clamp untouched", () => {
		// Documented quirk, shared with the native mirror: the clamp is
		// `Math.max(quantity, min)`, so NaN propagates rather than snapping.
		// Quantity is validated upstream, so this is not reachable from the API.
		expect(snapMealQuantityToStep(Number.NaN, "piece")).toBeNaN();
		expect(snapMealQuantityToStep(Number.POSITIVE_INFINITY, "piece")).toBe(
			Number.POSITIVE_INFINITY
		);
	});
});
