import { describe, expect, it } from "bun:test";

import { ApiRequestError } from "@/lib/api/api-request-error";
import { shouldRetryQuery } from "./query-retry";

function httpError(status: number): ApiRequestError {
	return new ApiRequestError("failed", { code: "http", status });
}

describe("shouldRetryQuery", () => {
	it("retries a network failure", () => {
		const networkError = new ApiRequestError("offline", {
			code: "network",
			status: 0,
		});
		expect(shouldRetryQuery(0, networkError)).toBe(true);
	});

	it("retries a 5xx, which may be transient", () => {
		expect(shouldRetryQuery(0, httpError(503))).toBe(true);
	});

	it("never retries a 4xx — repeating it cannot change the answer", () => {
		expect(shouldRetryQuery(0, httpError(400))).toBe(false);
		expect(shouldRetryQuery(0, httpError(401))).toBe(false);
		expect(shouldRetryQuery(0, httpError(409))).toBe(false);
		expect(shouldRetryQuery(0, httpError(499))).toBe(false);
	});

	it("caps at three attempts", () => {
		expect(shouldRetryQuery(2, httpError(500))).toBe(true);
		expect(shouldRetryQuery(3, httpError(500))).toBe(false);
	});
});
