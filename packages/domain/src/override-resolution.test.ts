import { describe, expect, it } from "bun:test";

import {
	type MealItemOverrideSlotRow,
	type MealTimeOverrideRow,
	overrideSlotKey,
	resolveMealTimeOverridesForDate,
	resolveOverridesForDate,
} from "./override-resolution";

type TestOverrideRow = MealItemOverrideSlotRow & {
	foodItemId: string;
};

function overrideRow(partial: Partial<TestOverrideRow> = {}): TestOverrideRow {
	return {
		dietPlanMealId: "meal-1",
		mealItemId: "item-1",
		foodItemId: "food-default",
		effectiveDates: ["2026-01-01"],
		updatedAt: new Date("2026-01-01T00:00:00.000Z"),
		...partial,
	};
}

describe("overrideSlotKey", () => {
	it("keys a slot by plan meal and meal item", () => {
		expect(overrideSlotKey("meal-1", "item-1")).toBe("meal-1:item-1");
	});
});

describe("resolveOverridesForDate", () => {
	it("returns the row whose effectiveDates contain the date", () => {
		const rows = [
			overrideRow({
				effectiveDates: ["2026-04-01", "2026-04-08"],
				foodItemId: "food-match",
			}),
		];

		expect(
			resolveOverridesForDate(rows, "2026-04-08").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-match");
	});

	it("supports a different food per day within the same slot", () => {
		const rows = [
			overrideRow({ effectiveDates: ["2026-04-08"], foodItemId: "food-a" }),
			overrideRow({ effectiveDates: ["2026-04-09"], foodItemId: "food-b" }),
		];

		expect(
			resolveOverridesForDate(rows, "2026-04-08").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-a");
		expect(
			resolveOverridesForDate(rows, "2026-04-09").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-b");
	});

	it("picks the greatest updatedAt when several rows cover the date", () => {
		const rows = [
			overrideRow({
				effectiveDates: ["2026-04-01", "2026-04-08"],
				foodItemId: "food-old",
				updatedAt: new Date("2026-04-01T10:00:00.000Z"),
			}),
			overrideRow({
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-new",
				updatedAt: new Date("2026-04-01T11:00:00.000Z"),
			}),
		];

		expect(
			resolveOverridesForDate(rows, "2026-04-08").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-new");
	});

	it("picks the newest row regardless of its position in the input", () => {
		const rows = [
			overrideRow({
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-new",
				updatedAt: new Date("2026-04-01T11:00:00.000Z"),
			}),
			overrideRow({
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-old",
				updatedAt: new Date("2026-04-01T10:00:00.000Z"),
			}),
		];

		expect(
			resolveOverridesForDate(rows, "2026-04-08").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-new");
	});

	it("keeps the first row on an updatedAt tie", () => {
		const sameInstant = new Date("2026-04-01T10:00:00.000Z");
		const rows = [
			overrideRow({
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-first",
				updatedAt: sameInstant,
			}),
			overrideRow({
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-second",
				updatedAt: new Date(sameInstant),
			}),
		];

		expect(
			resolveOverridesForDate(rows, "2026-04-08").get("meal-1:item-1")
				?.foodItemId
		).toBe("food-first");
	});

	it("keeps slots independent", () => {
		const rows = [
			overrideRow({
				mealItemId: "item-1",
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-a",
			}),
			overrideRow({
				mealItemId: "item-2",
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-b",
			}),
			overrideRow({
				dietPlanMealId: "meal-2",
				mealItemId: "item-1",
				effectiveDates: ["2026-04-08"],
				foodItemId: "food-c",
			}),
		];

		const resolved = resolveOverridesForDate(rows, "2026-04-08");
		expect(resolved.get("meal-1:item-1")?.foodItemId).toBe("food-a");
		expect(resolved.get("meal-1:item-2")?.foodItemId).toBe("food-b");
		expect(resolved.get("meal-2:item-1")?.foodItemId).toBe("food-c");
	});

	it("returns nothing when no row covers the date", () => {
		const rows = [
			overrideRow({ effectiveDates: ["2026-04-10"] }),
			overrideRow({ effectiveDates: ["2026-04-12"] }),
		];

		const resolved = resolveOverridesForDate(rows, "2026-04-08");
		expect(resolved.get("meal-1:item-1")).toBeUndefined();
		expect(resolved.size).toBe(0);
	});

	it("returns an empty map for empty input or an empty date set", () => {
		expect(resolveOverridesForDate([], "2026-04-08").size).toBe(0);
		expect(
			resolveOverridesForDate(
				[overrideRow({ effectiveDates: [] })],
				"2026-04-08"
			).size
		).toBe(0);
	});
});

const TODAY = "2026-04-08";
const YESTERDAY = "2026-04-07";
const TOMORROW = "2026-04-09";

describe("resolveMealTimeOverridesForDate", () => {
	it("prefers an exact-date row over a future-only row", () => {
		const rows: MealTimeOverrideRow[] = [
			{ dietPlanMealId: "meal-1", scheduledTime: "09:00", effectiveDate: null },
			{
				dietPlanMealId: "meal-1",
				scheduledTime: "10:30",
				effectiveDate: TODAY,
			},
		];

		expect(
			resolveMealTimeOverridesForDate(rows, TODAY, TODAY).get("meal-1")
		).toBe("10:30");
	});

	it("prefers the exact-date row whichever order the rows arrive in", () => {
		const rows: MealTimeOverrideRow[] = [
			{
				dietPlanMealId: "meal-1",
				scheduledTime: "10:30",
				effectiveDate: TODAY,
			},
			{ dietPlanMealId: "meal-1", scheduledTime: "09:00", effectiveDate: null },
		];

		expect(
			resolveMealTimeOverridesForDate(rows, TODAY, TODAY).get("meal-1")
		).toBe("10:30");
	});

	it("applies a future-only row to today and later, never to the past", () => {
		const rows: MealTimeOverrideRow[] = [
			{ dietPlanMealId: "meal-1", scheduledTime: "08:15", effectiveDate: null },
		];

		expect(
			resolveMealTimeOverridesForDate(rows, TODAY, TODAY).get("meal-1")
		).toBe("08:15");
		expect(
			resolveMealTimeOverridesForDate(rows, TOMORROW, TODAY).get("meal-1")
		).toBe("08:15");
		expect(
			resolveMealTimeOverridesForDate(rows, YESTERDAY, TODAY).get("meal-1")
		).toBeUndefined();
	});

	it("still honours an exact-date row for a past date", () => {
		const rows: MealTimeOverrideRow[] = [
			{
				dietPlanMealId: "meal-1",
				scheduledTime: "07:45",
				effectiveDate: YESTERDAY,
			},
			{ dietPlanMealId: "meal-1", scheduledTime: "08:15", effectiveDate: null },
		];

		expect(
			resolveMealTimeOverridesForDate(rows, YESTERDAY, TODAY).get("meal-1")
		).toBe("07:45");
	});

	it("resolves each plan meal independently", () => {
		const rows: MealTimeOverrideRow[] = [
			{ dietPlanMealId: "meal-1", scheduledTime: "08:15", effectiveDate: null },
			{
				dietPlanMealId: "meal-2",
				scheduledTime: "13:00",
				effectiveDate: TODAY,
			},
			{
				dietPlanMealId: "meal-3",
				scheduledTime: "19:00",
				effectiveDate: TOMORROW,
			},
		];

		const resolved = resolveMealTimeOverridesForDate(rows, TODAY, TODAY);
		expect(resolved.get("meal-1")).toBe("08:15");
		expect(resolved.get("meal-2")).toBe("13:00");
		expect(resolved.get("meal-3")).toBeUndefined();
	});

	it("returns nothing when no row matches", () => {
		const rows: MealTimeOverrideRow[] = [
			{
				dietPlanMealId: "meal-1",
				scheduledTime: "08:15",
				effectiveDate: TOMORROW,
			},
		];

		expect(resolveMealTimeOverridesForDate(rows, TODAY, TODAY).size).toBe(0);
		expect(resolveMealTimeOverridesForDate([], TODAY, TODAY).size).toBe(0);
	});

	it("defaults today to the real UTC today when not injected", () => {
		const realToday = new Date().toISOString().slice(0, 10);
		const rows: MealTimeOverrideRow[] = [
			{ dietPlanMealId: "meal-1", scheduledTime: "08:15", effectiveDate: null },
		];

		expect(resolveMealTimeOverridesForDate(rows, realToday).get("meal-1")).toBe(
			"08:15"
		);
		expect(
			resolveMealTimeOverridesForDate(rows, "2000-01-01").get("meal-1")
		).toBeUndefined();
	});
});
