import { describe, expect, it } from "bun:test";

import {
	createDietPlanAssignmentNutritionistInputSchema,
	setMealItemOverrideBodySchema,
	updateDietPlanAssignmentBodySchema,
} from "./schemas";

const PLAN_ID = "550e8400-e29b-41d4-a716-446655440000";
const MEAL_ID = "550e8400-e29b-41d4-a716-446655440001";
const OTHER_MEAL_ID = "550e8400-e29b-41d4-a716-446655440002";
const FOOD_ITEM_ID = "f15f7a96-bb52-46ba-8e09-7f1b9655e87a";
const OVERRIDE_ID = "0a6f5ca2-4b26-4f76-9a8d-fbc6f02f5f44";

describe("createDietPlanAssignmentNutritionistInputSchema", () => {
	it("accepts a create payload with meal-time overrides, including a clear", () => {
		const parsed = createDietPlanAssignmentNutritionistInputSchema.safeParse({
			dietPlanId: PLAN_ID,
			endDate: "2026-03-31",
			mealTimeOverrides: [
				{ dietPlanMealId: MEAL_ID, scheduledTime: "08:00" },
				{ dietPlanMealId: OTHER_MEAL_ID, scheduledTime: null },
			],
			memberId: "member-1",
			startDate: "2026-03-01",
		});

		expect(parsed.success).toBe(true);
	});

	it("requires a memberId", () => {
		const parsed = createDietPlanAssignmentNutritionistInputSchema.safeParse({
			dietPlanId: PLAN_ID,
			endDate: "2026-03-31",
			startDate: "2026-03-01",
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects an end date before the start date", () => {
		const parsed = createDietPlanAssignmentNutritionistInputSchema.safeParse({
			dietPlanId: PLAN_ID,
			endDate: "2026-02-28",
			memberId: "member-1",
			startDate: "2026-03-01",
		});

		expect(parsed.success).toBe(false);
	});

	it("accepts a single-day assignment", () => {
		const parsed = createDietPlanAssignmentNutritionistInputSchema.safeParse({
			dietPlanId: PLAN_ID,
			endDate: "2026-03-01",
			memberId: "member-1",
			startDate: "2026-03-01",
		});

		expect(parsed.success).toBe(true);
	});

	it("rejects a scheduled time that is not HH:mm", () => {
		const parsed = createDietPlanAssignmentNutritionistInputSchema.safeParse({
			dietPlanId: PLAN_ID,
			endDate: "2026-03-31",
			mealTimeOverrides: [{ dietPlanMealId: MEAL_ID, scheduledTime: "24:00" }],
			memberId: "member-1",
			startDate: "2026-03-01",
		});

		expect(parsed.success).toBe(false);
	});
});

describe("updateDietPlanAssignmentBodySchema", () => {
	it("allows meal-time overrides alone, without moving the dates", () => {
		const parsed = updateDietPlanAssignmentBodySchema.safeParse({
			mealTimeOverrides: [{ dietPlanMealId: MEAL_ID, scheduledTime: "12:30" }],
		});

		expect(parsed.success).toBe(true);
	});

	it("rejects an empty patch", () => {
		expect(updateDietPlanAssignmentBodySchema.safeParse({}).success).toBe(false);
	});

	it("rejects duplicate dietPlanMealId entries", () => {
		const parsed = updateDietPlanAssignmentBodySchema.safeParse({
			mealTimeOverrides: [
				{ dietPlanMealId: MEAL_ID, scheduledTime: "08:00" },
				{ dietPlanMealId: MEAL_ID, scheduledTime: "09:00" },
			],
		});

		expect(parsed.success).toBe(false);
	});

	it("allows moving only one end of the window", () => {
		expect(
			updateDietPlanAssignmentBodySchema.safeParse({ endDate: "2026-04-30" })
				.success
		).toBe(true);
	});
});

describe("setMealItemOverrideBodySchema", () => {
	it("accepts an explicit single_day payload", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			quantity: 1.5,
			scope: "single_day",
			startDate: "2026-04-10",
		});

		expect(parsed.success).toBe(true);
	});

	it("accepts an explicit rest_of_plan payload", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			quantity: 2,
			scope: "rest_of_plan",
			startDate: "2026-04-12",
		});

		expect(parsed.success).toBe(true);
	});

	it("accepts an overrideId for a targeted edit", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			overrideId: OVERRIDE_ID,
			quantity: 2,
			scope: "single_day",
			startDate: "2026-04-12",
		});

		expect(parsed.success).toBe(true);
	});

	it("rejects the retired period scope", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			quantity: 1,
			scope: "period",
			startDate: "2026-04-15",
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects an endDate, because the window is derived", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			endDate: "2026-04-10",
			foodItemId: FOOD_ITEM_ID,
			quantity: 1,
			scope: "single_day",
			startDate: "2026-04-10",
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects the retired fromDate payload", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			fromDate: "2026-04-12",
			quantity: 2,
		});

		expect(parsed.success).toBe(false);
	});

	it("rejects a non-positive quantity", () => {
		const parsed = setMealItemOverrideBodySchema.safeParse({
			foodItemId: FOOD_ITEM_ID,
			quantity: 0,
			scope: "single_day",
			startDate: "2026-04-10",
		});

		expect(parsed.success).toBe(false);
	});
});
