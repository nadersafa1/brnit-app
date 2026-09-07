import { describe, expect, it } from "bun:test";

import { isAuditableMethod } from "./constants";
import {
	deriveActionName,
	deriveEndpointPath,
	deriveOrganizationIdFromUrl,
	deriveResource,
	extractClientIp,
	extractUserAgent,
} from "./derive-audit-fields";

describe("isAuditableMethod", () => {
	it("accepts the mutating methods", () => {
		for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
			expect(isAuditableMethod(method)).toBe(true);
		}
	});

	it("rejects reads, so a GET never writes a row", () => {
		for (const method of ["GET", "HEAD", "OPTIONS"]) {
			expect(isAuditableMethod(method)).toBe(false);
		}
	});

	it("is case sensitive — Express always uppercases", () => {
		expect(isAuditableMethod("post")).toBe(false);
	});
});

describe("deriveResource", () => {
	it("takes the first segment after /api/ and TitleCases it", () => {
		expect(deriveResource("/api/admin/food-items")).toBe("Admin");
		expect(deriveResource("/api/member/me/consumption-streak")).toBe("Member");
	});

	it("collapses kebab and snake separators", () => {
		expect(deriveResource("/api/direct-admin/x")).toBe("DirectAdmin");
		expect(deriveResource("/api/direct_admin/x")).toBe("DirectAdmin");
	});

	it("returns null when there is no segment after the prefix", () => {
		expect(deriveResource("/api")).toBeNull();
		expect(deriveResource("/")).toBeNull();
	});

	it("uses the first segment when the path is not under /api", () => {
		expect(deriveResource("/health/live")).toBe("Health");
	});

	it("does NOT strip the version segment", () => {
		// Documented behaviour: the caller is responsible for handing over a
		// version-free path. The audit middleware strips `/v1` before calling
		// this, which is why rows read `Admin` and not `V1`.
		expect(deriveResource("/api/v1/admin/food-items")).toBe("V1");
	});
});

describe("deriveActionName", () => {
	it("maps each method to its verb", () => {
		expect(deriveActionName("POST", "/api/admin/x")).toBe("CreateAdmin");
		expect(deriveActionName("GET", "/api/admin/x")).toBe("GetAdmin");
		expect(deriveActionName("PATCH", "/api/admin/x")).toBe("UpdateAdmin");
		expect(deriveActionName("PUT", "/api/admin/x")).toBe("UpdateAdmin");
		expect(deriveActionName("DELETE", "/api/admin/x")).toBe("DeleteAdmin");
	});

	it("falls back to a stable label when no resource can be derived", () => {
		expect(deriveActionName("POST", "/api")).toBe("CreateRequest");
	});

	it("never leaks a dynamic id into the label", () => {
		const name = deriveActionName(
			"DELETE",
			"/api/admin/food-items/8f14e45f-ceea-467a-9c1a-1f1b1c1d1e1f"
		);
		expect(name).toBe("DeleteAdmin");
		expect(name).not.toContain("8f14e45f");
	});
});

describe("deriveEndpointPath", () => {
	it("strips the query string, so no query values are ever stored", () => {
		expect(deriveEndpointPath("/api/member/me/food-items?q=kale&page=2")).toBe(
			"/api/member/me/food-items"
		);
	});

	it("passes a bare pathname through", () => {
		expect(deriveEndpointPath("/api/admin/meals")).toBe("/api/admin/meals");
	});

	it("handles an absolute URL", () => {
		expect(deriveEndpointPath("https://brnit.app/api/admin/meals?x=1")).toBe(
			"/api/admin/meals"
		);
	});
});

describe("deriveOrganizationIdFromUrl", () => {
	it("reads the orgId query param", () => {
		expect(deriveOrganizationIdFromUrl("/api/x?orgId=org_123")).toBe("org_123");
	});

	it("returns null when absent", () => {
		expect(deriveOrganizationIdFromUrl("/api/x")).toBeNull();
	});

	it("treats a blank value as absent", () => {
		expect(deriveOrganizationIdFromUrl("/api/x?orgId=")).toBeNull();
		expect(deriveOrganizationIdFromUrl("/api/x?orgId=%20")).toBeNull();
	});

	it("ignores any other organization-ish param", () => {
		// Preserved quirk: only `?orgId=` counts. The session's active
		// organization is deliberately not consulted, so requests relying on it
		// record a null organization.
		expect(
			deriveOrganizationIdFromUrl("/api/x?organizationId=org_123")
		).toBeNull();
	});
});

describe("extractClientIp", () => {
	it("takes the first entry of x-forwarded-for", () => {
		expect(
			extractClientIp({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })
		).toBe("203.0.113.7");
	});

	it("falls back to x-real-ip", () => {
		expect(extractClientIp({ "x-real-ip": "203.0.113.9" })).toBe("203.0.113.9");
	});

	it("prefers x-forwarded-for over x-real-ip", () => {
		expect(
			extractClientIp({
				"x-forwarded-for": "203.0.113.7",
				"x-real-ip": "203.0.113.9",
			})
		).toBe("203.0.113.7");
	});

	it("handles a repeated header arriving as an array", () => {
		expect(extractClientIp({ "x-forwarded-for": ["203.0.113.7"] })).toBe(
			"203.0.113.7"
		);
	});

	it("returns null when neither header is present or usable", () => {
		expect(extractClientIp({})).toBeNull();
		expect(extractClientIp({ "x-forwarded-for": "   " })).toBeNull();
	});
});

describe("extractUserAgent", () => {
	it("trims the header", () => {
		expect(extractUserAgent({ "user-agent": "  brnit-native/1.0  " })).toBe(
			"brnit-native/1.0"
		);
	});

	it("returns null when absent or blank", () => {
		expect(extractUserAgent({})).toBeNull();
		expect(extractUserAgent({ "user-agent": "" })).toBeNull();
	});
});
