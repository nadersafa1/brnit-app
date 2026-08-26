import { describe, expect, it } from "bun:test";

import {
	mealReminderDelayMs,
	parseMealReminderJobPayload,
} from "./meal-reminder-contract.js";

const HOUR_MS = 60 * 60 * 1000;

describe("mealReminderDelayMs", () => {
	const nowMs = Date.parse("2026-08-25T09:00:00.000Z");

	it("counts_forward_to_a_later_slot_on_the_same_day", () => {
		expect(mealReminderDelayMs("2026-08-25", "13:00", nowMs)).toBe(4 * HOUR_MS);
	});

	it("returns_zero_at_the_slot_time", () => {
		expect(mealReminderDelayMs("2026-08-25", "09:00", nowMs)).toBe(0);
	});

	it("goes_negative_for_a_slot_already_past", () => {
		expect(mealReminderDelayMs("2026-08-25", "08:00", nowMs)).toBe(-HOUR_MS);
	});

	it("interprets_HH_mm_as_UTC_regardless_of_the_process_clock", () => {
		expect(mealReminderDelayMs("2026-08-26", "00:00", nowMs)).toBe(
			15 * HOUR_MS
		);
	});
});

describe("parseMealReminderJobPayload", () => {
	const payload = {
		dietPlanAssignmentId: "asg_1",
		dietPlanMealId: "meal_1",
		userId: "usr_1",
		dateYmd: "2026-08-25",
		scheduledTime: "08:30",
		mealType: "Breakfast",
	};

	it("accepts_a_well_formed_payload", () => {
		expect(parseMealReminderJobPayload(payload).success).toBe(true);
	});

	it.each([
		{ name: "a_24_hour_clock_overflow", changed: { scheduledTime: "24:00" } },
		{
			name: "a_time_without_a_leading_zero",
			changed: { scheduledTime: "8:30" },
		},
		{
			name: "an_iso_timestamp_as_the_date",
			changed: { dateYmd: "2026-08-25T00:00:00Z" },
		},
	])("rejects_$name", ({ changed }) => {
		expect(
			parseMealReminderJobPayload({ ...payload, ...changed }).success
		).toBe(false);
	});
});
