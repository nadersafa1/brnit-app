import { describe, expect, it } from "bun:test";

import { HttpError } from "../http-error";
import {
	assertDietPlanDeletable,
	assertDietPlanEditable,
	assertNoDietPlanMealRemoveUpdateOverlap,
	assertScheduledMealIdsExist,
	assertSlotIdsBelongToPlan,
	DIET_PLAN_ASSIGNED_DELETE_MESSAGE,
	DIET_PLAN_ASSIGNED_EDIT_MESSAGE,
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

describe("assertDietPlanEditable", () => {
	it("passes for an unassigned plan", () => {
		expect(() => assertDietPlanEditable(false)).not.toThrow();
	});

	it("throws 409 with the contract message for an assigned plan", () => {
		const err = captureHttpError(() => assertDietPlanEditable(true));

		expect(err.status).toBe(409);
		expect(err.message).toBe(DIET_PLAN_ASSIGNED_EDIT_MESSAGE);
	});
});

describe("assertDietPlanDeletable", () => {
	it("passes for an unassigned plan", () => {
		expect(() => assertDietPlanDeletable(false)).not.toThrow();
	});

	it("throws 409 with the contract message for an assigned plan", () => {
		const err = captureHttpError(() => assertDietPlanDeletable(true));

		expect(err.status).toBe(409);
		expect(err.message).toBe(DIET_PLAN_ASSIGNED_DELETE_MESSAGE);
	});

	it("uses wording distinct from the edit refusal", () => {
		expect(DIET_PLAN_ASSIGNED_DELETE_MESSAGE).not.toBe(
			DIET_PLAN_ASSIGNED_EDIT_MESSAGE
		);
	});
});

describe("assertNoDietPlanMealRemoveUpdateOverlap", () => {
	it("passes for disjoint remove and update lists", () => {
		expect(() =>
			assertNoDietPlanMealRemoveUpdateOverlap(["slot-a"], ["slot-b"])
		).not.toThrow();
	});

	it("throws 400 naming every id in both lists", () => {
		const err = captureHttpError(() =>
			assertNoDietPlanMealRemoveUpdateOverlap(
				["slot-b", "slot-a"],
				["slot-a", "slot-b"]
			)
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe(
			"Diet plan meal(s) cannot appear in both remove and update: slot-a, slot-b"
		);
	});
});

describe("assertSlotIdsBelongToPlan", () => {
	it("passes when nothing was referenced", () => {
		expect(() => assertSlotIdsBelongToPlan([], [])).not.toThrow();
	});

	it("passes when every referenced slot exists on the plan", () => {
		expect(() =>
			assertSlotIdsBelongToPlan(["slot-a"], ["slot-a", "slot-b"])
		).not.toThrow();
	});

	it("throws 400 naming the slots that do not belong", () => {
		const err = captureHttpError(() =>
			assertSlotIdsBelongToPlan(["slot-a", "slot-b"], ["slot-b"])
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe(
			"Diet plan meal(s) not found or do not belong to this plan: slot-a"
		);
	});
});

describe("assertScheduledMealIdsExist", () => {
	it("passes when nothing is being scheduled", () => {
		expect(() => assertScheduledMealIdsExist([], [])).not.toThrow();
	});

	it("throws 400 naming the missing meals", () => {
		const err = captureHttpError(() =>
			assertScheduledMealIdsExist(["meal-1", "meal-2"], [])
		);

		expect(err.status).toBe(400);
		expect(err.message).toBe("Meal(s) not found: meal-1, meal-2");
	});
});
