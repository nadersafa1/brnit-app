import { describe, expect, it } from "bun:test";

import { withVersionedApiPath } from "./client";

describe("withVersionedApiPath", () => {
	it("inserts the API version into an unversioned /api path", () => {
		expect(withVersionedApiPath("/api/admin/food-items")).toBe(
			"/api/v1/admin/food-items"
		);
	});

	it("normalizes a path that is missing its leading slash", () => {
		expect(withVersionedApiPath("api/me/profile")).toBe("/api/v1/me/profile");
	});

	it("leaves an already-versioned path alone", () => {
		expect(withVersionedApiPath("/api/v2/admin/meals")).toBe(
			"/api/v2/admin/meals"
		);
	});

	it("never versions better-auth, which is mounted unversioned", () => {
		expect(withVersionedApiPath("/api/auth/sign-in/email")).toBe(
			"/api/auth/sign-in/email"
		);
	});

	it("leaves a non-API path untouched", () => {
		expect(withVersionedApiPath("/health")).toBe("/health");
	});
});
