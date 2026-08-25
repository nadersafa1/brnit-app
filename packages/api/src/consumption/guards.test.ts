import { describe, expect, it } from "bun:test";

import { HttpError } from "../http-error";
import {
	assertNoMissingFoodItems,
	assertNotAlreadyLogged,
	assertWithinAssignmentWindow,
	assertWithinBackdateWindow,
} from "./guards";

const ASSIGNMENT = { endDate: "2026-04-30", startDate: "2026-04-01" };
const TODAY = "2026-04-10";
const GRACE_DAYS = 2;
const MAX_PAST_DAYS = 2;

function capture(run: () => void): HttpError {
	try {
		run();
	} catch (err) {
		return err as HttpError;
	}
	throw new Error("expected the guard to reject");
}

describe("assertWithinAssignmentWindow", () => {
	it("accepts the plan's first day", () => {
		expect(() =>
			assertWithinAssignmentWindow("2026-04-01", ASSIGNMENT, GRACE_DAYS)
		).not.toThrow();
	});

	it("accepts the last day of the grace period", () => {
		expect(() =>
			assertWithinAssignmentWindow("2026-05-02", ASSIGNMENT, GRACE_DAYS)
		).not.toThrow();
	});

	it("rejects the day before the plan starts", () => {
		const error = capture(() =>
			assertWithinAssignmentWindow("2026-03-31", ASSIGNMENT, GRACE_DAYS)
		);

		expect(error).toBeInstanceOf(HttpError);
		expect(error.status).toBe(400);
		expect(error.causeDetail).toEqual({
			endDate: "2026-04-30",
			graceDays: GRACE_DAYS,
			startDate: "2026-04-01",
		});
	});

	it("rejects the day after the grace period ends", () => {
		expect(
			capture(() =>
				assertWithinAssignmentWindow("2026-05-03", ASSIGNMENT, GRACE_DAYS)
			).status
		).toBe(400);
	});

	it("closes the window on the plan's end date when there is no grace", () => {
		expect(() =>
			assertWithinAssignmentWindow("2026-04-30", ASSIGNMENT, 0)
		).not.toThrow();
		expect(
			capture(() => assertWithinAssignmentWindow("2026-05-01", ASSIGNMENT, 0))
				.status
		).toBe(400);
	});
});

describe("assertWithinBackdateWindow", () => {
	it("accepts today", () => {
		expect(() =>
			assertWithinBackdateWindow(TODAY, TODAY, MAX_PAST_DAYS)
		).not.toThrow();
	});

	it("accepts the oldest allowed day", () => {
		expect(() =>
			assertWithinBackdateWindow("2026-04-08", TODAY, MAX_PAST_DAYS)
		).not.toThrow();
	});

	it("rejects one day past the allowance and names the window", () => {
		const error = capture(() =>
			assertWithinBackdateWindow("2026-04-07", TODAY, MAX_PAST_DAYS)
		);

		expect(error.status).toBe(400);
		expect(error.causeDetail).toEqual({
			reason: "consumedAt must be between 2026-04-08 and 2026-04-10",
		});
	});

	it("rejects tomorrow however generous the allowance", () => {
		expect(
			capture(() => assertWithinBackdateWindow("2026-04-11", TODAY, 365)).status
		).toBe(400);
	});

	it("allows only today when backdating is disabled", () => {
		expect(() => assertWithinBackdateWindow(TODAY, TODAY, 0)).not.toThrow();
		expect(
			capture(() => assertWithinBackdateWindow("2026-04-09", TODAY, 0)).status
		).toBe(400);
	});
});

describe("assertNotAlreadyLogged", () => {
	it("passes when the slot is free on that day", () => {
		expect(() => assertNotAlreadyLogged(undefined)).not.toThrow();
	});

	it("rejects a second log for the same slot and day with 409", () => {
		const error = capture(() => assertNotAlreadyLogged("consumption_1"));

		expect(error.status).toBe(409);
		expect(error.message).toBe(
			"Consumption already logged for this slot on this date"
		);
	});
});

describe("assertNoMissingFoodItems", () => {
	it("passes when nothing is missing", () => {
		expect(() => assertNoMissingFoodItems([])).not.toThrow();
	});

	it("names every missing food id", () => {
		const error = capture(() => assertNoMissingFoodItems(["food_a", "food_b"]));

		expect(error.status).toBe(400);
		expect(error.message).toBe("Food item(s) not found: food_a, food_b");
	});
});
