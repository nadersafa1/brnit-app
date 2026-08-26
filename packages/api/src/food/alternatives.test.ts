import { describe, expect, it } from "bun:test";

import type {
	AlternativeCandidateRow,
	AlternativesTolerancePct,
	PerUnitMacros,
} from "./alternatives";
import {
	buildFoodItemAlternatives,
	buildMacroTolerance,
	paginateAlternatives,
	referenceMacroTotals,
	suggestedQuantityInUnit,
	toMacroNumber,
} from "./alternatives";

/** 15% on every macro — the shipped default for all four tolerance vars. */
const TOLERANCES: AlternativesTolerancePct = {
	caloriesPct: 15,
	carbsPct: 15,
	fatPct: 15,
	proteinPct: 15,
};

/** Chicken breast per 100 g. */
const CHICKEN: PerUnitMacros = {
	calories: 165,
	carbs: 0,
	fat: 3.6,
	protein: 31,
	unit: "100g",
};

/** 150 g of chicken: 247.5 kcal / 46.5 P / 0 C / 5.4 F. */
const REFERENCE = referenceMacroTotals(150, CHICKEN);

const PROTEINS = [{ id: "cat-1", name: "Proteins" }];

function candidate(
	overrides: Partial<AlternativeCandidateRow> &
		Pick<AlternativeCandidateRow, "id">
): AlternativeCandidateRow {
	return {
		calories: "170",
		carbs: "0",
		categories: PROTEINS,
		fat: "4",
		gramsPerUnit: null,
		name: "Turkey breast",
		protein: "32",
		unit: "100g",
		...overrides,
	};
}

function match(
	candidates: AlternativeCandidateRow[],
	tolerances: AlternativesTolerancePct = TOLERANCES
) {
	return buildFoodItemAlternatives({
		candidates,
		reference: REFERENCE,
		tolerances,
	});
}

describe("toMacroNumber", () => {
	it("parses the strings Drizzle returns for numeric columns", () => {
		expect(toMacroNumber("3.6")).toBe(3.6);
	});

	it("treats missing and unparseable values as zero", () => {
		expect(toMacroNumber(null)).toBe(0);
		expect(toMacroNumber(undefined)).toBe(0);
		expect(toMacroNumber("not a number")).toBe(0);
	});
});

describe("referenceMacroTotals", () => {
	it("scales 100g macros by grams over 100", () => {
		expect(REFERENCE.calories).toBeCloseTo(247.5, 6);
		expect(REFERENCE.protein).toBeCloseTo(46.5, 6);
		expect(REFERENCE.carbs).toBeCloseTo(0, 6);
		expect(REFERENCE.fat).toBeCloseTo(5.4, 6);
	});

	it("counts whole units for every other unit", () => {
		const totals = referenceMacroTotals(2, {
			calories: 78,
			carbs: 0.6,
			fat: 5.3,
			protein: 6.3,
			unit: "piece",
		});
		expect(totals.calories).toBeCloseTo(156, 6);
		expect(totals.protein).toBeCloseTo(12.6, 6);
	});
});

describe("buildMacroTolerance", () => {
	it("builds symmetric bands around the reference macros", () => {
		const bands = buildMacroTolerance(REFERENCE, TOLERANCES);
		expect(bands.protMin).toBeCloseTo(39.525, 6);
		expect(bands.protMax).toBeCloseTo(53.475, 6);
		expect(bands.fatMin).toBeCloseTo(4.59, 6);
		expect(bands.fatMax).toBeCloseTo(6.21, 6);
	});

	it("produces no calorie band — calories are matched exactly", () => {
		const bands = buildMacroTolerance(REFERENCE, TOLERANCES);
		expect(Object.keys(bands).sort()).toEqual([
			"carbMax",
			"carbMin",
			"fatMax",
			"fatMin",
			"protMax",
			"protMin",
		]);
	});
});

describe("buildFoodItemAlternatives", () => {
	it("keeps a candidate whose scaled macros land inside every band", () => {
		const [item] = match([candidate({ id: "turkey" })]);

		expect(item?.foodItemId).toBe("turkey");
		expect(item?.calories).toBe(247.5);
		expect(item?.protein).toBe(46.6);
		expect(item?.carbs).toBe(0);
		expect(item?.fat).toBe(5.8);
	});

	it("reports deltas against the reference, rounded to one decimal", () => {
		const [item] = match([candidate({ id: "turkey" })]);

		expect(item?.deltaCalories).toBeCloseTo(0, 6);
		expect(item?.deltaProtein).toBe(0.1);
		expect(item?.deltaCarbs).toBe(0);
		expect(item?.deltaFat).toBe(0.4);
	});

	it("drops a candidate whose macros fall outside a band", () => {
		const rice = candidate({
			calories: "130",
			carbs: "28",
			fat: "0.3",
			id: "rice",
			name: "White rice",
			protein: "2.7",
		});

		expect(match([rice])).toEqual([]);
	});

	it("skips candidates with no calories, which have no matching quantity", () => {
		const water = candidate({ calories: "0", id: "water", protein: "0" });

		expect(match([water])).toEqual([]);
	});

	it("ignores the calorie tolerance, which is parsed but never applied", () => {
		const candidates = [candidate({ id: "turkey" })];
		const tight = match(candidates, { ...TOLERANCES, caloriesPct: 1 });
		const loose = match(candidates, { ...TOLERANCES, caloriesPct: 100 });

		expect(tight.map((item) => item.foodItemId)).toEqual(["turkey"]);
		expect(loose).toEqual(tight);
	});

	it("snaps a gram suggestion to the 50 g step", () => {
		// 247.5 kcal of a 170 kcal/100 g food is 145.6 g, which snaps to 150 g.
		const [item] = match([candidate({ id: "turkey" })]);

		expect(item?.suggestedQuantity).toBe(150);
		expect(item?.suggestedQuantityGrams).toBe(150);
	});

	it("snaps a unit suggestion to whole units and converts to grams", () => {
		const bar = candidate({
			calories: "60",
			fat: "1.31",
			gramsPerUnit: "40",
			id: "bar",
			name: "Protein bar",
			protein: "11.28",
			unit: "piece",
		});

		const [item] = match([bar]);

		expect(item?.unit).toBe("piece");
		expect(item?.suggestedQuantity).toBe(4);
		expect(item?.suggestedQuantityGrams).toBe(160);
	});

	it("omits the gram equivalence when the unit food has none", () => {
		const bar = candidate({
			calories: "60",
			fat: "1.31",
			gramsPerUnit: null,
			id: "bar",
			protein: "11.28",
			unit: "piece",
		});

		const [item] = match([bar]);

		expect(item?.suggestedQuantity).toBe(4);
		expect(item && "suggestedQuantityGrams" in item).toBe(false);
	});

	it("carries the candidate's categories through unchanged", () => {
		const [item] = match([candidate({ id: "turkey" })]);

		expect(item?.categories).toEqual(PROTEINS);
	});
});

describe("suggestedQuantityInUnit", () => {
	it("reads the factor as hundreds of grams for 100g foods", () => {
		expect(suggestedQuantityInUnit(1.5, "100g")).toBe(150);
	});

	it("reads the factor as a unit count for every other unit", () => {
		expect(suggestedQuantityInUnit(2.4, "piece")).toBe(2);
		expect(suggestedQuantityInUnit(1.3, "cup")).toBe(1.5);
	});

	it("never suggests less than one step", () => {
		expect(suggestedQuantityInUnit(0.01, "100g")).toBe(50);
		expect(suggestedQuantityInUnit(0.01, "piece")).toBe(1);
	});
});

describe("paginateAlternatives", () => {
	const matches = match([
		candidate({ id: "turkey-170" }),
		candidate({ calories: "180", fat: "4.2", id: "turkey-180", protein: "34" }),
		candidate({ calories: "160", fat: "3.8", id: "turkey-160", protein: "30" }),
	]);

	it("matches every in-band candidate before paginating", () => {
		expect(matches).toHaveLength(3);
	});

	it("returns the requested page of the full match list", () => {
		expect(paginateAlternatives(matches, 1, 2)).toHaveLength(2);
		expect(paginateAlternatives(matches, 2, 2)).toHaveLength(1);
	});

	it("returns an empty page past the end", () => {
		expect(paginateAlternatives(matches, 4, 2)).toEqual([]);
	});
});
