import { describe, expect, it } from "bun:test";

import {
	buildMealTimeOverridesPayload,
	mealTimeFieldMapFromPlanAndOverrides,
} from "./organization-diet-plan-assignments";

const PLAN_MEALS = [
	{ id: "meal-default-0800", scheduledTime: "08:00" },
	{ id: "meal-no-default", scheduledTime: null },
] as const;

describe("buildMealTimeOverridesPayload", () => {
	it("sends nothing when every field still matches the plan default", () => {
		expect(
			buildMealTimeOverridesPayload(PLAN_MEALS, {
				"meal-default-0800": "08:00",
				"meal-no-default": "",
			})
		).toEqual([]);
	});

	it("sends only the meals whose time was changed", () => {
		expect(
			buildMealTimeOverridesPayload(PLAN_MEALS, {
				"meal-default-0800": "09:30",
				"meal-no-default": "",
			})
		).toEqual([
			{ dietPlanMealId: "meal-default-0800", scheduledTime: "09:30" },
		]);
	});

	it("clears an override with an explicit null when the field is emptied", () => {
		expect(
			buildMealTimeOverridesPayload(PLAN_MEALS, {
				"meal-default-0800": "",
				"meal-no-default": "",
			})
		).toEqual([{ dietPlanMealId: "meal-default-0800", scheduledTime: null }]);
	});

	it("sends a time for a slot the plan left unscheduled", () => {
		expect(
			buildMealTimeOverridesPayload(PLAN_MEALS, {
				"meal-default-0800": "08:00",
				"meal-no-default": "21:15",
			})
		).toEqual([{ dietPlanMealId: "meal-no-default", scheduledTime: "21:15" }]);
	});

	it("treats a missing field as empty rather than as unchanged", () => {
		expect(buildMealTimeOverridesPayload(PLAN_MEALS, {})).toEqual([
			{ dietPlanMealId: "meal-default-0800", scheduledTime: null },
		]);
	});
});

describe("mealTimeFieldMapFromPlanAndOverrides", () => {
	it("prefers the assignment override, then the plan default, then blank", () => {
		expect(
			mealTimeFieldMapFromPlanAndOverrides(PLAN_MEALS, [
				{ dietPlanMealId: "meal-no-default", scheduledTime: "20:00" },
			])
		).toEqual({
			"meal-default-0800": "08:00",
			"meal-no-default": "20:00",
		});
	});

	it("round-trips to an empty payload when nothing is edited", () => {
		const fields = mealTimeFieldMapFromPlanAndOverrides(PLAN_MEALS, [
			{ dietPlanMealId: "meal-default-0800", scheduledTime: "11:00" },
		]);
		expect(buildMealTimeOverridesPayload(PLAN_MEALS, fields)).toEqual([
			{ dietPlanMealId: "meal-default-0800", scheduledTime: "11:00" },
		]);
	});
});
