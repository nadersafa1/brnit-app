import { describe, expect, it } from "bun:test";

import type {
	BuildCurrentDietPlanDaysInput,
	FoodDetails,
} from "./current-diet-plan";

// `@brnit/env/server` validates at import time; these placeholders let the
// module graph load in a shell with no `.env`.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";
process.env.CLOUDINARY_CLOUD_NAME ??= "demo";

const { buildCurrentDietPlanDays, resolveWindowDates } = await import(
	"./current-diet-plan"
);

type BuildInput = BuildCurrentDietPlanDaysInput;

const START_DATE = "2026-03-01";
const DAY_ONE = "2026-03-01";
const DAY_TWO = "2026-03-02";

/** 250 kcal per 100 g; quantities are grams. */
const FOOD_A: FoodDetails = {
	gramsPerUnit: null,
	nutrition: { calories: 250, carbs: 10, fat: 1.11, protein: 3.33 },
	unit: "100g",
};

/** Per-piece macros; quantity is a count. */
const FOOD_B: FoodDetails = {
	gramsPerUnit: 50,
	nutrition: { calories: 78, carbs: 0.6, fat: 5.3, protein: 6.2 },
	unit: "piece",
};

/** The food swapped in on day two. */
const FOOD_C: FoodDetails = {
	gramsPerUnit: null,
	nutrition: { calories: 100, carbs: 5, fat: 0.5, protein: 2 },
	unit: "100g",
};

const foodDetails = new Map<string, FoodDetails>([
	["food-a", FOOD_A],
	["food-b", FOOD_B],
	["food-c", FOOD_C],
]);

/** Repeats every day (`dayNumber === 0`); ordered first. */
const breakfastSlot: BuildInput["slots"][number] = {
	dayNumber: 0,
	id: "slot-breakfast",
	mealId: "meal-oats",
	mealItems: [
		{
			foodItemId: "food-a",
			foodName: "Oats",
			mealItemId: "item-oats",
			quantity: 150,
		},
		{
			foodItemId: "food-b",
			foodName: "Egg",
			mealItemId: "item-egg",
			quantity: 2,
		},
	],
	mealName: "Breakfast",
	mealOrder: 1,
	mealType: "breakfast",
	scheduledTime: "08:00",
};

/** Day-two only, and its single food row no longer exists. */
const lunchSlot: BuildInput["slots"][number] = {
	dayNumber: 2,
	id: "slot-lunch",
	mealId: "meal-chicken",
	mealItems: [
		{
			foodItemId: "food-deleted",
			foodName: "Chicken",
			mealItemId: "item-chicken",
			quantity: 100,
		},
	],
	mealName: "Lunch",
	mealOrder: 2,
	mealType: "lunch",
	scheduledTime: null,
};

function buildDays(overrides: Partial<BuildInput> = {}) {
	return buildCurrentDietPlanDays({
		allDates: [DAY_ONE, DAY_TWO],
		consumptions: new Map([
			[`${breakfastSlot.id}:${DAY_ONE}`, "2026-03-01T07:00:00.000Z"],
		]),
		foodDetails,
		mealTimeOverrides: [
			{
				dietPlanMealId: breakfastSlot.id,
				effectiveDate: DAY_TWO,
				scheduledTime: "09:30",
			},
		],
		overrides: [
			{
				dietPlanMealId: breakfastSlot.id,
				// The swap covers day two only.
				effectiveDates: [DAY_TWO],
				foodItemId: "food-c",
				foodName: "Overnight oats",
				mealItemId: "item-oats",
				quantity: 200,
				updatedAt: new Date("2026-02-20T00:00:00.000Z"),
			},
		],
		slots: [breakfastSlot, lunchSlot],
		startDate: START_DATE,
		...overrides,
	});
}

describe("resolveWindowDates", () => {
	it("intersects the requested window with the assignment window", () => {
		expect(
			resolveWindowDates("2026-03-01", "2026-03-05", {
				endDate: "2026-03-03",
				startDate: "2026-03-02",
			})
		).toEqual(["2026-03-02", "2026-03-03"]);
	});

	it("is empty when the window does not overlap the assignment", () => {
		expect(
			resolveWindowDates("2026-03-01", "2026-03-05", {
				endDate: "2026-04-30",
				startDate: "2026-04-01",
			})
		).toEqual([]);
	});
});

describe("buildCurrentDietPlanDays", () => {
	it("returns one entry per requested date", () => {
		expect(buildDays().map((day) => day.date)).toEqual([DAY_ONE, DAY_TWO]);
	});

	it("includes repeating slots every day and day-specific slots only on their day", () => {
		const [dayOne, dayTwo] = buildDays();

		expect(dayOne?.meals.map((entry) => entry.dietPlanMealId)).toEqual([
			"slot-breakfast",
		]);
		// Day two is plan day 2, so the `dayNumber: 2` slot appears, ordered
		// after the repeating one by `mealOrder`.
		expect(dayTwo?.meals.map((entry) => entry.dietPlanMealId)).toEqual([
			"slot-breakfast",
			"slot-lunch",
		]);
	});

	it("leaves the item unchanged on a date the override does not cover", () => {
		const [dayOne] = buildDays();
		const item = dayOne?.meals[0]?.mealItems[0];

		expect(item?.isOverridden).toBe(false);
		expect(item?.foodItemId).toBe("food-a");
		expect(item?.quantity).toBe(150);
		expect(item?.originalFoodItemId).toBeUndefined();
		expect(item?.macros).toEqual({
			calories: 375,
			carbs: 15,
			fat: 1.7,
			protein: 5,
		});
	});

	it("applies the override on its effective date and reports the original", () => {
		const [, dayTwo] = buildDays();
		const item = dayTwo?.meals[0]?.mealItems[0];

		expect(item?.isOverridden).toBe(true);
		expect(item?.foodItemId).toBe("food-c");
		expect(item?.foodName).toBe("Overnight oats");
		expect(item?.quantity).toBe(200);
		expect(item?.originalFoodItemId).toBe("food-a");
		expect(item?.originalFoodName).toBe("Oats");
		expect(item?.originalQuantity).toBe(150);
		expect(item?.originalUnit).toBe("100g");
		// Macros follow the swapped-in food, not the planned one.
		expect(item?.macros).toEqual({
			calories: 200,
			carbs: 10,
			fat: 1,
			protein: 4,
		});
	});

	it("uses the food's own unit when computing macros", () => {
		const [dayOne] = buildDays();
		const egg = dayOne?.meals[0]?.mealItems[1];

		expect(egg?.unit).toBe("piece");
		expect(egg?.gramsPerUnit).toBe(50);
		// `piece` means quantity is a count, so the factor is 2, not 2/100.
		expect(egg?.macros).toEqual({
			calories: 156,
			carbs: 1.2,
			fat: 10.6,
			protein: 12.4,
		});
	});

	it("treats a missing food as zeros measured in grams", () => {
		const [, dayTwo] = buildDays();
		const item = dayTwo?.meals[1]?.mealItems[0];

		expect(item?.unit).toBe("100g");
		expect(item?.gramsPerUnit).toBeNull();
		expect(item?.macros).toEqual({
			calories: 0,
			carbs: 0,
			fat: 0,
			protein: 0,
		});
	});

	it("rounds up to the tenth at the meal and day levels", () => {
		const [dayOne, dayTwo] = buildDays();

		expect(dayOne?.meals[0]?.macros).toEqual({
			calories: 531,
			carbs: 16.2,
			fat: 12.3,
			protein: 17.4,
		});
		expect(dayOne?.macros).toEqual({
			calories: 531,
			carbs: 16.2,
			fat: 12.3,
			protein: 17.4,
		});
		// Day two swaps one item and adds an all-zero meal.
		expect(dayTwo?.macros).toEqual({
			calories: 356,
			carbs: 11.2,
			fat: 11.6,
			protein: 16.4,
		});
	});

	it("marks consumption per meal and date", () => {
		const [dayOne, dayTwo] = buildDays();

		expect(dayOne?.meals[0]?.consumed).toBe(true);
		expect(dayOne?.meals[0]?.consumedAt).toBe("2026-03-01T07:00:00.000Z");
		expect(dayTwo?.meals[0]?.consumed).toBe(false);
		expect(dayTwo?.meals[0]?.consumedAt).toBeUndefined();
	});

	it("prefers an exact-date meal-time override over the plan's own time", () => {
		const [dayOne, dayTwo] = buildDays();

		expect(dayOne?.meals[0]?.scheduledTime).toBe("08:00");
		expect(dayTwo?.meals[0]?.scheduledTime).toBe("09:30");
		// No override and no plan time at all.
		expect(dayTwo?.meals[1]?.scheduledTime).toBeUndefined();
	});

	it("orders meals by mealOrder, then mealType, then id", () => {
		const days = buildDays({
			allDates: [DAY_ONE],
			slots: [
				{ ...lunchSlot, dayNumber: 0, id: "slot-z", mealOrder: 1, mealType: "b" },
				{ ...lunchSlot, dayNumber: 0, id: "slot-a", mealOrder: 1, mealType: "b" },
				{ ...lunchSlot, dayNumber: 0, id: "slot-m", mealOrder: 1, mealType: "a" },
				{ ...breakfastSlot, id: "slot-late", mealOrder: 2 },
			],
		});

		expect(days[0]?.meals.map((entry) => entry.dietPlanMealId)).toEqual([
			"slot-m",
			"slot-a",
			"slot-z",
			"slot-late",
		]);
	});

	it("uses the newest override when several cover the same date", () => {
		const days = buildDays({
			allDates: [DAY_TWO],
			overrides: [
				{
					dietPlanMealId: breakfastSlot.id,
					effectiveDates: [DAY_TWO],
					foodItemId: "food-c",
					foodName: "Older swap",
					mealItemId: "item-oats",
					quantity: 200,
					updatedAt: new Date("2026-02-20T00:00:00.000Z"),
				},
				{
					dietPlanMealId: breakfastSlot.id,
					effectiveDates: [DAY_TWO],
					foodItemId: "food-b",
					foodName: "Newer swap",
					mealItemId: "item-oats",
					quantity: 3,
					updatedAt: new Date("2026-02-25T00:00:00.000Z"),
				},
			],
			slots: [breakfastSlot],
		});

		expect(days[0]?.meals[0]?.mealItems[0]?.foodName).toBe("Newer swap");
	});
});
