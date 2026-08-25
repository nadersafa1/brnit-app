import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MulticastResponse {
	responses: { success: boolean; error?: { code: string } }[];
}

const sendEachForMulticast = mock(
	(): Promise<MulticastResponse> => Promise.resolve({ responses: [] })
);
const getFirebaseMessaging = mock((): unknown => ({ sendEachForMulticast }));

mock.module("./firebase-admin", () => ({ getFirebaseMessaging }));

const { sendPushToTokens } = await import("./send-push");

describe("sendPushToTokens", () => {
	beforeEach(() => {
		sendEachForMulticast.mockClear();
		getFirebaseMessaging.mockClear();
		getFirebaseMessaging.mockImplementation(() => ({ sendEachForMulticast }));
	});

	it("short_circuits_without_touching_firebase_when_no_tokens_remain", async () => {
		const result = await sendPushToTokens({
			tokens: ["", ""],
			title: "t",
			body: "b",
		});

		expect(result).toEqual({ sent: 0, failed: 0, staleTokens: [] });
		expect(getFirebaseMessaging).not.toHaveBeenCalled();
	});

	it("counts_every_token_as_failed_when_firebase_is_unconfigured", async () => {
		getFirebaseMessaging.mockImplementation(() => null);

		const result = await sendPushToTokens({
			tokens: ["tok_a", "tok_b"],
			title: "t",
			body: "b",
		});

		expect(result).toEqual({ sent: 0, failed: 2, staleTokens: [] });
	});

	it("deduplicates_tokens_before_sending", async () => {
		sendEachForMulticast.mockImplementation(() =>
			Promise.resolve({ responses: [{ success: true }] })
		);

		const result = await sendPushToTokens({
			tokens: ["tok_a", "tok_a"],
			title: "t",
			body: "b",
		});

		expect(sendEachForMulticast.mock.calls[0]?.[0]).toMatchObject({
			tokens: ["tok_a"],
		});
		expect(result.sent).toBe(1);
	});

	it("reports_only_unregistered_and_invalid_tokens_as_stale", async () => {
		sendEachForMulticast.mockImplementation(() =>
			Promise.resolve({
				responses: [
					{ success: true },
					{
						success: false,
						error: { code: "messaging/registration-token-not-registered" },
					},
					{
						success: false,
						error: { code: "messaging/invalid-registration-token" },
					},
					{ success: false, error: { code: "messaging/server-unavailable" } },
				],
			})
		);

		const result = await sendPushToTokens({
			tokens: ["tok_ok", "tok_gone", "tok_bad", "tok_flaky"],
			title: "t",
			body: "b",
		});

		expect(result.sent).toBe(1);
		expect(result.failed).toBe(3);
		expect(result.staleTokens).toEqual(["tok_gone", "tok_bad"]);
	});

	it("sets_the_android_channel_only_when_one_is_given", async () => {
		sendEachForMulticast.mockImplementation(() =>
			Promise.resolve({ responses: [{ success: true }] })
		);

		await sendPushToTokens({
			tokens: ["tok_a"],
			title: "t",
			body: "b",
			channelId: "meal_reminder",
		});
		expect(sendEachForMulticast.mock.calls[0]?.[0]).toMatchObject({
			android: { notification: { channelId: "meal_reminder" } },
		});

		await sendPushToTokens({ tokens: ["tok_a"], title: "t", body: "b" });
		expect(sendEachForMulticast.mock.calls[1]?.[0]?.android).toBeUndefined();
	});
});
