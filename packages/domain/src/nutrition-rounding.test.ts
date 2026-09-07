import { describe, expect, it } from "bun:test";

import {
	roundNutritionMacro,
	roundNutritionMacroNullable,
	roundNutritionMacroRequired,
	roundUpToTenth,
} from "./nutrition-rounding";

describe("roundNutritionMacro", () => {
	it("rounds to the nearest 2 decimals", () => {
		expect(roundNutritionMacro(12.3456)).toBe(12.35);
		expect(roundNutritionMacro(12.344)).toBe(12.34);
		expect(roundNutritionMacro(12.345)).toBe(12.35);
		expect(roundNutritionMacro(0)).toBe(0);
	});

	it("rounds down as readily as up, unlike roundUpToTenth", () => {
		expect(roundNutritionMacro(0.001)).toBe(0);
		expect(roundUpToTenth(0.001)).toBe(0.1);
	});

	it("is stable under repeated application (safe to persist and re-read)", () => {
		const once = roundNutritionMacro(199.994);
		expect(roundNutritionMacro(once)).toBe(once);
		expect(once).toBe(199.99);
	});

	it("handles negatives symmetrically", () => {
		expect(roundNutritionMacro(-12.344)).toBe(-12.34);
	});
});

describe("roundNutritionMacroNullable", () => {
	it("rounds parseable numerics, including Drizzle numeric strings", () => {
		expect(roundNutritionMacroNullable("9.876")).toBe(9.88);
		expect(roundNutritionMacroNullable(4.321)).toBe(4.32);
		expect(roundNutritionMacroNullable("0")).toBe(0);
	});

	it("keeps null for missing or unusable values", () => {
		expect(roundNutritionMacroNullable(null)).toBeNull();
		expect(roundNutritionMacroNullable(undefined)).toBeNull();
		expect(roundNutritionMacroNullable("")).toBeNull();
		expect(roundNutritionMacroNullable("not-a-number")).toBeNull();
		expect(roundNutritionMacroNullable(Number.POSITIVE_INFINITY)).toBeNull();
	});
});

describe("roundNutritionMacroRequired", () => {
	it("rounds parseable numerics", () => {
		expect(roundNutritionMacroRequired("101.239")).toBe(101.24);
		expect(roundNutritionMacroRequired(101.231)).toBe(101.23);
	});

	it("treats missing or unusable values as zero", () => {
		expect(roundNutritionMacroRequired(null)).toBe(0);
		expect(roundNutritionMacroRequired(undefined)).toBe(0);
		expect(roundNutritionMacroRequired("")).toBe(0);
		expect(roundNutritionMacroRequired("not-a-number")).toBe(0);
	});
});

describe("roundUpToTenth", () => {
	it("always rounds up to one decimal", () => {
		expect(roundUpToTenth(1.01)).toBe(1.1);
		expect(roundUpToTenth(1.09)).toBe(1.1);
		expect(roundUpToTenth(1.1)).toBe(1.1);
		expect(roundUpToTenth(0.0001)).toBe(0.1);
	});

	it("leaves exact tenths and zero alone", () => {
		expect(roundUpToTenth(0)).toBe(0);
		expect(roundUpToTenth(2)).toBe(2);
		expect(roundUpToTenth(2.5)).toBe(2.5);
	});

	it("rounds negatives toward zero, as Math.ceil does", () => {
		expect(roundUpToTenth(-1.01)).toBe(-1);
	});

	it("compounds upward when applied at every aggregation level", () => {
		// Item level: three items of 1.01 each display as 1.1.
		const items = [1.01, 1.01, 1.01].map(roundUpToTenth);
		expect(items).toEqual([1.1, 1.1, 1.1]);
		// Meal level: the sum of displayed items is ceilinged again.
		const meal = roundUpToTenth(items.reduce((sum, value) => sum + value, 0));
		expect(meal).toBe(3.3);
		// The raw sum would have been 3.03 -> 3.1. This drift is the documented
		// behaviour of the member-facing rule and must not be "fixed".
		expect(roundUpToTenth(1.01 * 3)).toBe(3.1);
	});

	it("differs from the persisted rule on the same input", () => {
		expect(roundUpToTenth(12.344)).toBe(12.4);
		expect(roundNutritionMacro(12.344)).toBe(12.34);
	});
});
