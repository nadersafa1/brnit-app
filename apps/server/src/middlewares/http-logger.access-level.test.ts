import { describe, expect, it } from "bun:test";
import type { LevelWithSilent } from "pino";

import {
	isNoisyAccessPath,
	requestPathname,
	resolveAccessLogLevel,
	SLOW_REQUEST_WARN_MS,
} from "./http-logger.access-level.js";

describe("requestPathname", () => {
	it.each([
		["/api/v1/admin/food-items?page=2", "/api/v1/admin/food-items"],
		["/api/v1/health", "/api/v1/health"],
		[undefined, ""],
	])("returns %j for %j", (originalUrl, expected) => {
		expect(requestPathname(originalUrl)).toBe(expected);
	});
});

describe("isNoisyAccessPath", () => {
	it.each([
		["OPTIONS", "/api/auth/organization/set-active", true],
		["GET", "/api/v1/health", true],
		["GET", "/", true],
		["GET", "/api/auth/get-session", true],
		["POST", "/api/v1/member/me/diet-plan-meal-consumptions", false],
	])("%s %s -> noisy=%s", (method, originalUrl, expected) => {
		expect(isNoisyAccessPath(method, originalUrl)).toBe(expected);
	});
});

describe("resolveAccessLogLevel", () => {
	const cases: [string, string, number, number, LevelWithSilent][] = [
		["GET", "/api/auth/get-session", 200, 6, "debug"],
		["GET", "/api/v1/health", 200, 117, "debug"],
		["OPTIONS", "/api/auth/organization/set-active", 204, 0, "debug"],
		["POST", "/api/v1/admin/meals", 201, 67, "info"],
		["GET", "/api/v1/member/me/current-diet-plan", 200, 72, "info"],
		["GET", "/api/v1/admin/meals/abc", 500, 12, "warn"],
		["GET", "/api/v1/admin/meals/abc", 200, 1500, "warn"],
		["GET", "/api/auth/get-session", 200, SLOW_REQUEST_WARN_MS, "warn"],
		["GET", "/api/v1/health", 404, 20, "debug"],
	];

	it.each(cases)(
		"%s %s status=%s rt=%sms -> %s",
		(method, originalUrl, statusCode, responseTimeMs, expected) => {
			expect(
				resolveAccessLogLevel(method, originalUrl, statusCode, responseTimeMs)
			).toBe(expected);
		}
	);
});
