import { describe, expect, it } from "bun:test";

import {
	mealReminderJobId,
	mealReminderPushJobId,
	sanitizeJobIdPart,
	streakNudgePushJobId,
} from "./job-ids.js";

describe("sanitizeJobIdPart", () => {
	it("replaces_characters_bullmq_rejects_in_a_job_id", () => {
		expect(sanitizeJobIdPart("a:b/c d")).toBe("a_b_c_d");
	});

	it("keeps_the_characters_ids_actually_use", () => {
		expect(sanitizeJobIdPart("7f3a-91bc_DE")).toBe("7f3a-91bc_DE");
	});
});

describe("mealReminderJobId", () => {
	const slot = {
		dietPlanAssignmentId: "asg_1",
		dietPlanMealId: "meal_1",
		dateYmd: "2026-08-25",
	};

	it("is_stable_for_the_same_slot_and_day", () => {
		expect(mealReminderJobId(slot)).toBe(mealReminderJobId({ ...slot }));
	});

	it("contains_no_colon", () => {
		expect(
			mealReminderJobId({ ...slot, dietPlanAssignmentId: "asg:1" })
		).not.toContain(":");
	});

	it.each([
		{ name: "day", changed: { dateYmd: "2026-08-26" } },
		{ name: "slot", changed: { dietPlanMealId: "meal_2" } },
		{ name: "assignment", changed: { dietPlanAssignmentId: "asg_2" } },
	])("differs_when_the_$name_differs", ({ changed }) => {
		expect(mealReminderJobId({ ...slot, ...changed })).not.toBe(
			mealReminderJobId(slot)
		);
	});

	it("is_namespaced_apart_from_the_push_it_produces", () => {
		expect(mealReminderPushJobId(slot)).not.toBe(mealReminderJobId(slot));
	});
});

describe("streakNudgePushJobId", () => {
	it("is_one_id_per_user_per_day", () => {
		const args = { userId: "usr_1", dateYmd: "2026-08-25" };
		expect(streakNudgePushJobId(args)).toBe(streakNudgePushJobId({ ...args }));
		expect(streakNudgePushJobId({ ...args, dateYmd: "2026-08-26" })).not.toBe(
			streakNudgePushJobId(args)
		);
	});
});
