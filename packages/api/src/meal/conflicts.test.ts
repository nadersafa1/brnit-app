import { describe, expect, it } from "bun:test";

import { HttpError } from "../http-error";
import {
	assertMealFoodItemIdsExist,
	assertMealHasNoLineItems,
	assertMealItemIdsBelongToMeal,
	assertMealNotInAssignedPlan,
	assertMealNotUsedInDietPlan,
	assertNoMealItemRemoveUpdateOverlap,
	MEAL_HAS_ITEMS_MESSAGE,
	MEAL_IN_ASSIGNED_PLAN_MESSAGE,
	MEAL_USED_IN_PLAN_MESSAGE,
} from "./conflicts";

/** Runs `fn` and returns the `HttpError` it threw, failing if it threw nothing. */
function captureHttpError(fn: () => void): HttpError {
	try {
		fn();
	} catch (err) {
		if (err instanceof HttpError) {
			return err;
		}
		throw err;
	}
	throw new Error("expected an HttpError but the assertion passed");
}

describe("assertMealNotInAssignedPlan", () => {
	it("passes when the meal is in no assigned plan", () => {
		expect(() => assertMealNotInAssignedPlan(false)).not.toThrow();
	});

	it("throws 409 with the contract message when it is", () => {
		const err = captureHttpError(() => assertMealNotInAssignedPlan(true));

		expect(err.status).toBe(409);
		expect(err.message).toBe(MEAL_IN_ASSIGNED_PLAN_MESSAGE);
	});
});

describe("assertMealHasNoLineItems", () => {
	it("passes for a meal with no lines", () => {
		expect(() => assertMealHasNoLineItems(0)).not.toThrow();
	});

	it("throws 409 as soon as one line remains", () => {
		const err = captureHttpError(() => assertMealHasNoLineItems(1));

		expect(err.status).toBe(409);
		expect(err.message).toBe(MEAL_HAS_ITEMS_MESSAGE);
	});
});

describe("assertMealNotUsedInDietPlan", () => {
	it("passes when no plan slot references the meal", () => {
		expect(() => assertMealNotUsedInDietPlan(false)).not.toThrow();
	});

	it("throws 409 when a plan slot still references it", () => {
		const err = captureHttpError(() => assertMealNotUsedInDietPlan(true));

		expect(err.status).toBe(409);
		expect(err.message).toBe(MEAL_USED_IN_PLAN_MESSAGE);
	});
});

describe("assertNoMealItemRemoveUpdateOverlap", () => {
	it("passes for disjoint remove and update lists", () => {
		expect(() =>
			assertNoMealItemRemoveUpdateOverlap(["a"], ["b"])
		).not.toThrow();
	});

	it("passes when remove is absent", () => {
		expect(() =>
			assertNoMealItemRemoveUpdateOverlap(undefined, ["a"])
		).not.toThrow();
	});

	it("throws 400 naming every id in both lists", () => {
		const err = captureHttpError(() =>
			assertNoMealItemRemoveUpdateOverlap(["b", "a"], ["a", "b", "c"])
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe(
			"Meal item(s) cannot appear in both remove and update: a, b"
		);
	});
});

describe("assertMealItemIdsBelongToMeal", () => {
	it("passes when nothing was referenced", () => {
		expect(() => assertMealItemIdsBelongToMeal([], [])).not.toThrow();
	});

	it("passes when every referenced line exists on the meal", () => {
		expect(() =>
			assertMealItemIdsBelongToMeal(["a", "b"], ["b", "a"])
		).not.toThrow();
	});

	it("throws 400 naming the lines that do not belong", () => {
		const err = captureHttpError(() =>
			assertMealItemIdsBelongToMeal(["a", "b", "c"], ["b"])
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe(
			"Meal item(s) not found or do not belong to this meal: a, c"
		);
	});
});

describe("assertMealFoodItemIdsExist", () => {
	it("passes when nothing is being added", () => {
		expect(() => assertMealFoodItemIdsExist([], [])).not.toThrow();
	});

	it("throws 400 naming the missing foods", () => {
		const err = captureHttpError(() =>
			assertMealFoodItemIdsExist(["kale", "oats"], ["oats"])
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe("Food item(s) not found: kale");
	});
});
