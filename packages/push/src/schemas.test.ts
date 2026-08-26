import { describe, expect, it } from "bun:test";

import { parsePushNotificationJobPayload } from "./schemas";

describe("parsePushNotificationJobPayload", () => {
	it("accepts_a_minimal_payload", () => {
		const parsed = parsePushNotificationJobPayload({
			userId: "usr_1",
			title: "Time to eat",
			body: "Lunch is due",
		});
		expect(parsed.success).toBe(true);
	});

	it("rejects_non_string_data_values", () => {
		const parsed = parsePushNotificationJobPayload({
			userId: "usr_1",
			title: "Time to eat",
			body: "Lunch is due",
			data: { dietPlanMealId: 7 },
		});
		expect(parsed.success).toBe(false);
	});

	it("rejects_an_unknown_category", () => {
		const parsed = parsePushNotificationJobPayload({
			userId: "usr_1",
			title: "Time to eat",
			body: "Lunch is due",
			category: "marketing",
		});
		expect(parsed.success).toBe(false);
	});
});
