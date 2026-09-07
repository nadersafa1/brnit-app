import { describe, expect, it } from "bun:test";
import type { OrganizationContextDto } from "@brnit/api";
import { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api/organization/context";

import {
	resolveActiveNavPath,
	resolveDashboardNavGroups,
} from "./dashboard-nav-groups";

function contextWith(
	overrides: Partial<OrganizationContextDto>
): OrganizationContextDto {
	return {
		...ANONYMOUS_ORGANIZATION_CONTEXT,
		isAuthenticated: true,
		...overrides,
	};
}

function groupIds(groups: readonly { id: string }[]): string[] {
	return groups.map((group) => group.id);
}

describe("resolveDashboardNavGroups", () => {
	it("shows only the workspace group to a plain user", () => {
		const groups = resolveDashboardNavGroups("user", contextWith({}));
		expect(groupIds(groups)).toEqual(["nav-workspace"]);
	});

	it("gives an app admin every group", () => {
		const groups = resolveDashboardNavGroups(
			"admin",
			contextWith({ isAppAdmin: true })
		);
		expect(groupIds(groups)).toEqual([
			"nav-workspace",
			"nav-admin",
			"nav-direct-admin",
			"nav-nutritionist",
		]);
	});

	it("shows the nutritionist group to a global app-role nutritionist with no organization", () => {
		const groups = resolveDashboardNavGroups("nutritionist", contextWith({}));
		expect(groupIds(groups)).toContain("nav-nutritionist");
		expect(groupIds(groups)).not.toContain("nav-admin");
	});

	it("requires an active organization for an org-role nutritionist", () => {
		const withoutOrg = resolveDashboardNavGroups(
			"user",
			contextWith({ isNutritionist: true, role: "nutritionist" })
		);
		expect(groupIds(withoutOrg)).not.toContain("nav-nutritionist");

		const withOrg = resolveDashboardNavGroups(
			"user",
			contextWith({
				activeOrgId: "org-1",
				isNutritionist: true,
				role: "nutritionist",
			})
		);
		expect(groupIds(withOrg)).toContain("nav-nutritionist");
	});

	it("shows the direct-admin group to an org owner with an active organization", () => {
		const groups = resolveDashboardNavGroups(
			"user",
			contextWith({ activeOrgId: "org-1", isOwner: true, role: "owner" })
		);
		expect(groupIds(groups)).toContain("nav-direct-admin");
	});
});

describe("resolveActiveNavPath", () => {
	const groups = resolveDashboardNavGroups(
		"admin",
		contextWith({ isAppAdmin: true })
	);

	it("matches the dashboard exactly", () => {
		expect(resolveActiveNavPath(groups, "/dashboard")).toBe("/dashboard");
	});

	it("prefers the deepest match over the shorter prefix", () => {
		expect(resolveActiveNavPath(groups, "/dashboard/admin/food-items")).toBe(
			"/dashboard/admin/food-items"
		);
	});

	it("keeps a detail route highlighted under its list", () => {
		expect(
			resolveActiveNavPath(groups, "/dashboard/admin/food-items/abc-123")
		).toBe("/dashboard/admin/food-items");
	});

	it("does not match a sibling that merely shares a prefix string", () => {
		expect(resolveActiveNavPath(groups, "/dashboard/administration")).toBe(
			"/dashboard"
		);
	});

	it("returns null when nothing matches", () => {
		expect(resolveActiveNavPath(groups, "/login")).toBeNull();
	});
});
