import { describe, expect, it } from "bun:test";

import {
	assignmentConsumptionWindow,
	consumptionBackdateWindow,
	isWithinDateWindow,
} from "./window";

const ASSIGNMENT = { endDate: "2026-04-30", startDate: "2026-04-01" };
const TODAY = "2026-04-10";

describe("assignmentConsumptionWindow", () => {
	it("runs from the start date to the end date plus the grace days", () => {
		expect(assignmentConsumptionWindow(ASSIGNMENT, 2)).toEqual({
			maxDate: "2026-05-02",
			minDate: "2026-04-01",
		});
	});

	it("ends on the assignment's last day when there is no grace", () => {
		expect(assignmentConsumptionWindow(ASSIGNMENT, 0).maxDate).toBe(
			"2026-04-30"
		);
	});

	it("crosses a month boundary correctly", () => {
		expect(
			assignmentConsumptionWindow(
				{ endDate: "2026-02-28", startDate: "2026-02-01" },
				2
			).maxDate
		).toBe("2026-03-02");
	});

	it("accepts the first and last day of the window and nothing beyond", () => {
		const window = assignmentConsumptionWindow(ASSIGNMENT, 2);
		expect(isWithinDateWindow("2026-04-01", window)).toBe(true);
		expect(isWithinDateWindow("2026-05-02", window)).toBe(true);
		expect(isWithinDateWindow("2026-03-31", window)).toBe(false);
		expect(isWithinDateWindow("2026-05-03", window)).toBe(false);
	});
});

describe("consumptionBackdateWindow", () => {
	it("runs from today minus the allowance up to today", () => {
		expect(consumptionBackdateWindow(TODAY, 2)).toEqual({
			maxDate: "2026-04-10",
			minDate: "2026-04-08",
		});
	});

	it("collapses to today when no backdating is allowed", () => {
		expect(consumptionBackdateWindow(TODAY, 0)).toEqual({
			maxDate: TODAY,
			minDate: TODAY,
		});
	});

	it("accepts both boundaries and rejects the days just outside", () => {
		const window = consumptionBackdateWindow(TODAY, 2);
		expect(isWithinDateWindow("2026-04-08", window)).toBe(true);
		expect(isWithinDateWindow(TODAY, window)).toBe(true);
		expect(isWithinDateWindow("2026-04-07", window)).toBe(false);
	});

	it("always rejects tomorrow", () => {
		expect(
			isWithinDateWindow("2026-04-11", consumptionBackdateWindow(TODAY, 365))
		).toBe(false);
	});

	it("crosses a year boundary correctly", () => {
		expect(consumptionBackdateWindow("2026-01-01", 2).minDate).toBe(
			"2025-12-30"
		);
	});
});

describe("the two windows together", () => {
	/**
	 * A day inside the assignment's grace period is still rejected once it falls
	 * out of the backdate allowance — the guards are layered, not alternatives.
	 */
	it("requires membership of both windows", () => {
		const assignmentWindow = assignmentConsumptionWindow(ASSIGNMENT, 2);
		const backdateWindow = consumptionBackdateWindow(TODAY, 2);
		const lateLog = "2026-04-05";

		expect(isWithinDateWindow(lateLog, assignmentWindow)).toBe(true);
		expect(isWithinDateWindow(lateLog, backdateWindow)).toBe(false);
	});

	it("rejects a day inside the backdate allowance but before the plan started", () => {
		const assignmentWindow = assignmentConsumptionWindow(
			{ endDate: "2026-04-30", startDate: "2026-04-09" },
			2
		);
		const backdateWindow = consumptionBackdateWindow(TODAY, 2);

		expect(isWithinDateWindow("2026-04-08", backdateWindow)).toBe(true);
		expect(isWithinDateWindow("2026-04-08", assignmentWindow)).toBe(false);
	});
});
