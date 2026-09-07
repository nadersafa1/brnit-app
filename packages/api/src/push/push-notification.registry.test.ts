import { afterEach, describe, expect, it, mock } from "bun:test";

import {
	dispatchPushNotificationBestEffort,
	type PushNotificationDispatch,
	setPushNotificationHandler,
} from "./push-notification.registry";

const dispatch: PushNotificationDispatch = {
	jobId: "push-streak-usr_1-2026-08-25",
	payload: { userId: "usr_1", title: "Keep your streak", body: "Log a meal" },
};

describe("dispatchPushNotificationBestEffort", () => {
	afterEach(() => {
		setPushNotificationHandler(null);
	});

	it("routes_to_the_registered_handler", () => {
		const handler = mock((_dispatch: PushNotificationDispatch) =>
			Promise.resolve()
		);
		setPushNotificationHandler(handler);

		dispatchPushNotificationBestEffort(dispatch);

		expect(handler).toHaveBeenCalledTimes(1);
		expect(handler).toHaveBeenCalledWith(dispatch);
	});

	it("drops_silently_when_no_handler_is_registered", () => {
		expect(() => {
			dispatchPushNotificationBestEffort(dispatch);
		}).not.toThrow();
	});

	it("swallows_a_rejecting_handler", async () => {
		setPushNotificationHandler(() => Promise.reject(new Error("redis down")));

		expect(() => {
			dispatchPushNotificationBestEffort(dispatch);
		}).not.toThrow();
		// Let the rejection settle so it cannot surface as an unhandled rejection.
		await Promise.resolve();
	});

	it("restores_the_default_handler_when_set_to_null", () => {
		const handler = mock((_dispatch: PushNotificationDispatch) =>
			Promise.resolve()
		);
		setPushNotificationHandler(handler);
		setPushNotificationHandler(null);

		dispatchPushNotificationBestEffort(dispatch);

		expect(handler).not.toHaveBeenCalled();
	});
});
