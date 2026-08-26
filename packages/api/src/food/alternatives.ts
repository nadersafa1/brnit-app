import type { FoodUnit } from "@brnit/domain";
import {
	DEFAULT_FOOD_UNIT,
	getMacroFactor,
	snapMealQuantityToStep,
	toEquivalentGrams,
} from "@brnit/domain";

import type { FoodItemAlternativeDto, FoodItemCategoryDto } from "./dto";

/**
 * The food-item alternatives algorithm, kept free of database access so the
 * scoring rules can be exercised directly.
 *
 * The shape of the match is: **calories are matched exactly, the other three
 * macros are matched within a tolerance band.** For each candidate we solve for
 * the quantity that yields the reference calories, then keep the candidate only
 * if protein, carbs and fat all land inside their bands at that quantity.
 */

/**
 * Hard ceiling on the alternatives page size, tighter than the generic
 * `MAX_PER_PAGE`. It lives here rather than with the query schema because it is
 * the scoring pass it protects: every candidate sharing a category with the
 * reference is scored in memory before a page can be cut.
 */
export const MAX_ALTERNATIVES_PER_PAGE = 20;
export const DEFAULT_ALTERNATIVES_PER_PAGE = 10;

const PERCENT = 100;
const MACRO_DISPLAY_SCALE = 10;
const SUGGESTED_QUANTITY_DECIMAL_SCALE = 10;
/** Grams per `100g` unit (100) at one-decimal precision (×10). */
const HUNDRED_GRAM_QUANTITY_SCALE = 1000;

/**
 * Rounds a reported macro to one decimal.
 *
 * Deliberately NOT `roundUpToTenth` from `@brnit/domain`: that rule rounds up
 * at every step because the member-facing plan totals must never understate
 * what someone is eating. Alternatives report a *comparison* — the deltas have
 * to be able to come out negative and symmetric — so they round to nearest, as
 * this endpoint always has.
 */
function roundMacroToTenth(value: number): number {
	return Math.round(value * MACRO_DISPLAY_SCALE) / MACRO_DISPLAY_SCALE;
}

/** Bare `numeric` reaches us as a string; anything unparseable counts as 0. */
export function toMacroNumber(value: string | null | undefined): number {
	if (value === null || value === undefined) {
		return 0;
	}
	const parsed = Number.parseFloat(String(value));
	return Number.isNaN(parsed) ? 0 : parsed;
}

/** Percentage bands, sourced from `@brnit/env/server` by the handler. */
export interface AlternativesTolerancePct {
	/**
	 * Parsed from `ALTERNATIVES_TOLERANCE_CAL_PCT` and **deliberately unused**.
	 *
	 * The suggested quantity is *solved* from the calorie ratio, so a match's
	 * scaled calories always equal the reference's exactly. A calorie band would
	 * therefore be inert, and the variable only looks like a bug if you read
	 * {@link buildMacroTolerance} without that in mind. It is carried here so the
	 * env var keeps a documented meaning, and so that anyone who does want a
	 * calorie filter has to decide deliberately what it should compare — per-unit
	 * density, say — rather than "restoring" a no-op.
	 */
	caloriesPct: number;
	carbsPct: number;
	fatPct: number;
	proteinPct: number;
}

export interface MacroTotals {
	calories: number;
	carbs: number;
	fat: number;
	protein: number;
}

/** Per-unit macros of a food, already parsed out of their `numeric` strings. */
export interface PerUnitMacros extends MacroTotals {
	unit: FoodUnit;
}

/**
 * A scoring candidate: the `food_item` row with its categories already mapped.
 *
 * Categories arrive pre-mapped so this module stays free of runtime imports —
 * the DTO mapper reaches Cloudinary for image URLs, which the scoring rules have
 * no business depending on.
 */
export interface AlternativeCandidateRow {
	calories: string | null;
	carbs: string | null;
	categories: FoodItemCategoryDto[];
	fat: string | null;
	gramsPerUnit: string | null;
	id: string;
	name: string;
	protein: string | null;
	unit: FoodUnit;
}

/**
 * Macros the reference food delivers at the requested quantity.
 *
 * `getMacroFactor` carries the unit semantics: grams over 100 for `100g`, a
 * plain count of units for everything else.
 */
export function referenceMacroTotals(
	quantity: number,
	macros: PerUnitMacros
): MacroTotals {
	const factor = getMacroFactor(quantity, macros.unit);
	return {
		calories: factor * macros.calories,
		carbs: factor * macros.carbs,
		fat: factor * macros.fat,
		protein: factor * macros.protein,
	};
}

interface MacroToleranceBands {
	carbMax: number;
	carbMin: number;
	fatMax: number;
	fatMin: number;
	protMax: number;
	protMin: number;
}

/** Absolute macro bands around the reference totals. Calories have no band — see {@link AlternativesTolerancePct.caloriesPct}. */
export function buildMacroTolerance(
	reference: MacroTotals,
	tolerances: AlternativesTolerancePct
): MacroToleranceBands {
	return {
		carbMax: reference.carbs * (1 + tolerances.carbsPct / PERCENT),
		carbMin: reference.carbs * (1 - tolerances.carbsPct / PERCENT),
		fatMax: reference.fat * (1 + tolerances.fatPct / PERCENT),
		fatMin: reference.fat * (1 - tolerances.fatPct / PERCENT),
		protMax: reference.protein * (1 + tolerances.proteinPct / PERCENT),
		protMin: reference.protein * (1 - tolerances.proteinPct / PERCENT),
	};
}

function matchesTolerance(
	scaled: Omit<MacroTotals, "calories">,
	bands: MacroToleranceBands
): boolean {
	if (scaled.protein < bands.protMin || scaled.protein > bands.protMax) {
		return false;
	}
	if (scaled.carbs < bands.carbMin || scaled.carbs > bands.carbMax) {
		return false;
	}
	return !(scaled.fat < bands.fatMin || scaled.fat > bands.fatMax);
}

/**
 * The calorie-matching factor expressed as a quantity in the candidate's unit,
 * snapped onto that unit's step (50 g, 1 piece, half a litre/cup/tbsp).
 *
 * For `100g` the factor is a multiple of 100 g, so it becomes grams with one
 * decimal before snapping; other units count whole items and the factor is
 * already the count.
 */
export function suggestedQuantityInUnit(
	factor: number,
	candidateUnit: FoodUnit
): number {
	// Both branches keep the exact float expression the pre-overhaul service
	// used, so the snapped suggestion cannot drift by a step on a .5 boundary.
	const raw =
		candidateUnit === DEFAULT_FOOD_UNIT
			? Math.round(factor * HUNDRED_GRAM_QUANTITY_SCALE) /
				SUGGESTED_QUANTITY_DECIMAL_SCALE
			: Math.round(factor * SUGGESTED_QUANTITY_DECIMAL_SCALE) /
				SUGGESTED_QUANTITY_DECIMAL_SCALE;
	return snapMealQuantityToStep(raw, candidateUnit);
}

/**
 * Gram equivalence of the suggestion, for the deprecated
 * `suggestedQuantityGrams` field.
 *
 * A food measured in units with no `grams_per_unit` gets **no** value rather
 * than the domain default of 100 g — inventing a gram figure here would be a
 * fabricated number in a nutrition response, so the field is omitted instead.
 */
function suggestedQuantityGrams(
	unit: FoodUnit,
	quantity: number,
	gramsPerUnit: string | null
): number | undefined {
	if (unit === DEFAULT_FOOD_UNIT) {
		return quantity;
	}
	if (gramsPerUnit == null) {
		return;
	}
	return toEquivalentGrams(quantity, unit, gramsPerUnit);
}

function scoreCandidate(
	candidate: AlternativeCandidateRow,
	reference: MacroTotals,
	bands: MacroToleranceBands
): FoodItemAlternativeDto | null {
	const perUnitCalories = toMacroNumber(candidate.calories);
	// A zero-calorie candidate has no factor that reaches the reference calories.
	if (perUnitCalories <= 0) {
		return null;
	}

	const factor = reference.calories / perUnitCalories;
	const totals: MacroTotals = {
		calories: factor * perUnitCalories,
		carbs: factor * toMacroNumber(candidate.carbs),
		fat: factor * toMacroNumber(candidate.fat),
		protein: factor * toMacroNumber(candidate.protein),
	};

	if (!matchesTolerance(totals, bands)) {
		return null;
	}

	const suggestedQuantity = suggestedQuantityInUnit(factor, candidate.unit);
	const grams = suggestedQuantityGrams(
		candidate.unit,
		suggestedQuantity,
		candidate.gramsPerUnit
	);

	return {
		calories: roundMacroToTenth(totals.calories),
		carbs: roundMacroToTenth(totals.carbs),
		categories: candidate.categories,
		deltaCalories: roundMacroToTenth(totals.calories - reference.calories),
		deltaCarbs: roundMacroToTenth(totals.carbs - reference.carbs),
		deltaFat: roundMacroToTenth(totals.fat - reference.fat),
		deltaProtein: roundMacroToTenth(totals.protein - reference.protein),
		fat: roundMacroToTenth(totals.fat),
		foodItemId: candidate.id,
		name: candidate.name,
		protein: roundMacroToTenth(totals.protein),
		suggestedQuantity,
		unit: candidate.unit,
		...(grams === undefined ? {} : { suggestedQuantityGrams: grams }),
	};
}

/**
 * Scores every candidate and returns the full match list, ordered.
 *
 * The ordering compares each match's **reported** calories against the
 * reference. Because the factor is solved from the calorie ratio, the raw total
 * is the reference total for every match and the only spread is one-decimal
 * rounding dust — so this is very nearly the order the candidate query returned.
 * That is the long-standing behaviour and clients page through it; do not
 * "improve" it into a macro-distance ranking without a contract change.
 */
export function buildFoodItemAlternatives(params: {
	candidates: AlternativeCandidateRow[];
	reference: MacroTotals;
	tolerances: AlternativesTolerancePct;
}): FoodItemAlternativeDto[] {
	const { candidates, reference, tolerances } = params;
	const bands = buildMacroTolerance(reference, tolerances);

	const matches: FoodItemAlternativeDto[] = [];
	for (const candidate of candidates) {
		const scored = scoreCandidate(candidate, reference, bands);
		if (scored) {
			matches.push(scored);
		}
	}

	matches.sort(
		(left, right) =>
			Math.abs(left.calories - reference.calories) -
			Math.abs(right.calories - reference.calories)
	);

	return matches;
}

/**
 * Alternatives paginate **after** filtering, in memory: the tolerance test
 * cannot be expressed as a SQL predicate without duplicating the unit
 * arithmetic, so `totalItems` is the count of all matches, not of all
 * candidates.
 */
export function paginateAlternatives(
	matches: FoodItemAlternativeDto[],
	page: number,
	perPage: number
): FoodItemAlternativeDto[] {
	const offset = Math.max(0, (page - 1) * perPage);
	return matches.slice(offset, offset + perPage);
}
