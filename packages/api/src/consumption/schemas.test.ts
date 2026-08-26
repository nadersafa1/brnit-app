import { describe, expect, it } from "bun:test";

import {
	createDietPlanMealConsumptionInputSchema,
	deleteDietPlanMealConsumptionBySlotInputSchema,
	dietPlanMealConsumptionListQuerySchema,
} from "./schemas";

const ASSIGNMENT_ID = "a1b2c3d4-e5f6-4789-a012-000000000001";
const MEAL_ID = "a1b2c3d4-e5f6-4789-a012-000000000002";
const FOOD_A = "a1b2c3d4-e5f6-4789-a012-000000000003";
const FOOD_B = "a1b2c3d4-e5f6-4789-a012-000000000004";
const MAX_CONSUMED_ITEMS = 50;

function body(extra: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		consumedAt: "2026-03-10T12:00:00.000Z",
		dietPlanAssignmentId: ASSIGNMENT_ID,
		dietPlanMealId: MEAL_ID,
		...extra,
	};
}

describe("createDietPlanMealConsumptionInputSchema", () => {
	it("accepts a body with no consumedItems", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(body());

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.consumedItems).toBeUndefined();
		}
	});

	it("accepts valid consumedItems", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(
			body({
				consumedItems: [
					{ foodItemId: FOOD_A, quantity: 150 },
					{ foodItemId: FOOD_B, quantity: 200 },
				],
			})
		);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.consumedItems).toHaveLength(2);
			expect(result.data.consumedItems?.[0]).toEqual({
				foodItemId: FOOD_A,
				quantity: 150,
			});
		}
	});

	it("normalizes consumedAt to a Date whichever form it arrives in", () => {
		const fromString = createDietPlanMealConsumptionInputSchema.safeParse(
			body()
		);
		const fromDate = createDietPlanMealConsumptionInputSchema.safeParse(
			body({ consumedAt: new Date("2026-03-10T12:00:00.000Z") })
		);

		expect(fromString.success).toBe(true);
		expect(fromDate.success).toBe(true);
		if (fromString.success && fromDate.success) {
			expect(fromString.data.consumedAt).toBeInstanceOf(Date);
			expect(fromDate.data.consumedAt.toISOString()).toBe(
				fromString.data.consumedAt.toISOString()
			);
		}
	});

	it("rejects a consumedItem with an invalid foodItemId", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(
			body({ consumedItems: [{ foodItemId: "not-a-uuid", quantity: 150 }] })
		);

		expect(result.success).toBe(false);
	});

	it("rejects a non-positive quantity", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(
			body({ consumedItems: [{ foodItemId: FOOD_A, quantity: 0 }] })
		);

		expect(result.success).toBe(false);
	});

	it("rejects more than the item cap", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(
			body({
				consumedItems: Array.from({ length: MAX_CONSUMED_ITEMS + 1 }, () => ({
					foodItemId: FOOD_A,
					quantity: 100,
				})),
			})
		);

		expect(result.success).toBe(false);
	});

	it("accepts usePlannedItems", () => {
		const result = createDietPlanMealConsumptionInputSchema.safeParse(
			body({ usePlannedItems: true })
		);

		expect(result.success).toBe(true);
	});
});

describe("deleteDietPlanMealConsumptionBySlotInputSchema", () => {
	it("accepts a slot plus a date", () => {
		const result = deleteDietPlanMealConsumptionBySlotInputSchema.safeParse({
			consumedDate: "2026-03-10",
			dietPlanAssignmentId: ASSIGNMENT_ID,
			dietPlanMealId: MEAL_ID,
		});

		expect(result.success).toBe(true);
	});

	it("rejects a timestamp where a calendar date is expected", () => {
		const result = deleteDietPlanMealConsumptionBySlotInputSchema.safeParse({
			consumedDate: "2026-03-10T12:00:00.000Z",
			dietPlanAssignmentId: ASSIGNMENT_ID,
			dietPlanMealId: MEAL_ID,
		});

		expect(result.success).toBe(false);
	});
});

describe("dietPlanMealConsumptionListQuerySchema", () => {
	it("defaults paging when nothing is supplied", () => {
		const result = dietPlanMealConsumptionListQuerySchema.safeParse({});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.page).toBe(1);
			expect(result.data.sortOrder).toBe("desc");
		}
	});

	it("rejects an unknown sort field", () => {
		const result = dietPlanMealConsumptionListQuerySchema.safeParse({
			sortBy: "calories",
		});

		expect(result.success).toBe(false);
	});
});
