import { describe, expect, it } from "bun:test";

import {
	resolvePostAuthPath,
	sanitizeRedirectPath,
} from "./post-auth-redirect";

describe("sanitizeRedirectPath", () => {
	it("accepts a same-site absolute path", () => {
		expect(sanitizeRedirectPath("/dashboard/admin/food-items")).toBe(
			"/dashboard/admin/food-items"
		);
	});

	it("keeps a query string on an accepted path", () => {
		expect(sanitizeRedirectPath("/dashboard?page=2")).toBe("/dashboard?page=2");
	});

	it("rejects an absolute URL to another origin", () => {
		expect(sanitizeRedirectPath("https://evil.example/steal")).toBeUndefined();
	});

	it("rejects a protocol-relative URL", () => {
		expect(sanitizeRedirectPath("//evil.example/steal")).toBeUndefined();
	});

	it("rejects the backslash form browsers normalize to a host", () => {
		expect(sanitizeRedirectPath("/\\evil.example")).toBeUndefined();
	});

	it("rejects a relative path, which could escape the current route", () => {
		expect(sanitizeRedirectPath("dashboard")).toBeUndefined();
	});

	it("rejects non-strings and empty strings", () => {
		expect(sanitizeRedirectPath(undefined)).toBeUndefined();
		expect(sanitizeRedirectPath("")).toBeUndefined();
		expect(sanitizeRedirectPath(42)).toBeUndefined();
	});
});

describe("resolvePostAuthPath", () => {
	it("returns the sanitized redirect when there is one", () => {
		expect(resolvePostAuthPath("/dashboard/organizations")).toBe(
			"/dashboard/organizations"
		);
	});

	it("falls back to the dashboard for a rejected redirect", () => {
		expect(resolvePostAuthPath("https://evil.example")).toBe("/dashboard");
	});

	it("falls back to the dashboard when nothing was requested", () => {
		expect(resolvePostAuthPath(undefined)).toBe("/dashboard");
	});
});
