import { describe, expect, it } from "bun:test";

import {
	APP_ADMIN_ROLE,
	APP_ROLES,
	canInviteMembers,
	canInviteWithAnyRole,
	canInviteWithRole,
	canUpdateMemberRole,
	DEFAULT_APP_ROLE,
	INVITABLE_ORGANIZATION_ROLES,
	isAppAdmin,
	isAppRole,
	isInvitableOrganizationRole,
	isOrganizationRole,
	ORG_ROLES_CAN_INVITE,
	ORG_ROLES_CAN_UPDATE_MEMBER_ROLE,
	ORGANIZATION_MEMBER_ROLE,
	ORGANIZATION_ROLES,
} from "./roles";

describe("role tuples", () => {
	it("lists the four app roles", () => {
		expect(APP_ROLES).toEqual(["admin", "nutritionist", "coach", "user"]);
		expect(DEFAULT_APP_ROLE).toBe("user");
		expect(APP_ADMIN_ROLE).toBe("admin");
	});

	it("lists the six organization roles", () => {
		expect(ORGANIZATION_ROLES).toEqual([
			"owner",
			"client_admin",
			"direct_admin",
			"nutritionist",
			"coach",
			"member",
		]);
		expect(ORGANIZATION_MEMBER_ROLE).toBe("member");
	});

	it("excludes owner from invitable roles (the creator is owner)", () => {
		expect(INVITABLE_ORGANIZATION_ROLES).not.toContain("owner");
		expect([...INVITABLE_ORGANIZATION_ROLES].sort()).toEqual(
			[...ORGANIZATION_ROLES].filter((role) => role !== "owner").sort()
		);
	});

	it("gates invites and role updates on owner/direct_admin", () => {
		expect(ORG_ROLES_CAN_INVITE).toEqual(["owner", "direct_admin"]);
		expect(ORG_ROLES_CAN_UPDATE_MEMBER_ROLE).toEqual(["owner", "direct_admin"]);
	});
});

describe("isAppRole", () => {
	it("accepts the declared roles only", () => {
		for (const role of APP_ROLES) {
			expect(isAppRole(role)).toBe(true);
		}
		expect(isAppRole("owner")).toBe(false);
		expect(isAppRole("superadmin")).toBe(false);
	});

	it("rejects non-strings so an unknown DB value narrows to null", () => {
		expect(isAppRole(null)).toBe(false);
		expect(isAppRole(undefined)).toBe(false);
		expect(isAppRole("")).toBe(false);
		expect(isAppRole(1)).toBe(false);
		expect(isAppRole(["admin"])).toBe(false);
	});
});

describe("isOrganizationRole", () => {
	it("accepts the declared roles only", () => {
		for (const role of ORGANIZATION_ROLES) {
			expect(isOrganizationRole(role)).toBe(true);
		}
		expect(isOrganizationRole("admin")).toBe(false);
		expect(isOrganizationRole("user")).toBe(false);
	});

	it("rejects non-strings", () => {
		expect(isOrganizationRole(null)).toBe(false);
		expect(isOrganizationRole(undefined)).toBe(false);
		expect(isOrganizationRole({})).toBe(false);
	});
});

describe("isInvitableOrganizationRole", () => {
	it("rejects owner but accepts every other org role", () => {
		expect(isInvitableOrganizationRole("owner")).toBe(false);
		expect(isInvitableOrganizationRole("member")).toBe(true);
		expect(isInvitableOrganizationRole("direct_admin")).toBe(true);
	});
});

describe("isAppAdmin", () => {
	it("matches only the admin app role", () => {
		expect(isAppAdmin("admin")).toBe(true);
		expect(isAppAdmin("nutritionist")).toBe(false);
		expect(isAppAdmin(null)).toBe(false);
		expect(isAppAdmin(undefined)).toBe(false);
	});
});

describe("canInviteWithAnyRole", () => {
	it("lets app admins invite with any role regardless of org role", () => {
		expect(canInviteWithAnyRole({ appRole: "admin", orgRole: null })).toBe(
			true
		);
		expect(canInviteWithAnyRole({ appRole: "admin", orgRole: "member" })).toBe(
			true
		);
	});

	it("lets owner and direct_admin invite with any role", () => {
		expect(canInviteWithAnyRole({ appRole: "user", orgRole: "owner" })).toBe(
			true
		);
		expect(
			canInviteWithAnyRole({ appRole: "user", orgRole: "direct_admin" })
		).toBe(true);
	});

	it("refuses client_admin, staff roles and plain members", () => {
		expect(
			canInviteWithAnyRole({ appRole: "user", orgRole: "client_admin" })
		).toBe(false);
		expect(
			canInviteWithAnyRole({ appRole: "nutritionist", orgRole: "nutritionist" })
		).toBe(false);
		expect(canInviteWithAnyRole({ appRole: "user", orgRole: "coach" })).toBe(
			false
		);
		expect(canInviteWithAnyRole({ appRole: "user", orgRole: "member" })).toBe(
			false
		);
		expect(canInviteWithAnyRole({})).toBe(false);
	});
});

describe("canInviteWithRole", () => {
	it("allows a member-role invite from any actor the AC layer let through", () => {
		expect(
			canInviteWithRole({
				appRole: "user",
				orgRole: "client_admin",
				role: "member",
			})
		).toBe(true);
	});

	it("requires owner/direct_admin or app admin above the member role", () => {
		expect(
			canInviteWithRole({
				appRole: "user",
				orgRole: "client_admin",
				role: "nutritionist",
			})
		).toBe(false);
		expect(
			canInviteWithRole({
				appRole: "user",
				orgRole: "direct_admin",
				role: "nutritionist",
			})
		).toBe(true);
		expect(
			canInviteWithRole({ appRole: "admin", orgRole: null, role: "owner" })
		).toBe(true);
	});
});

describe("canUpdateMemberRole", () => {
	it("allows app admins, owners and direct admins", () => {
		expect(canUpdateMemberRole({ appRole: "admin", orgRole: null })).toBe(true);
		expect(canUpdateMemberRole({ appRole: "user", orgRole: "owner" })).toBe(
			true
		);
		expect(
			canUpdateMemberRole({ appRole: "user", orgRole: "direct_admin" })
		).toBe(true);
	});

	it("refuses client_admin — it may invite but never change roles", () => {
		expect(
			canUpdateMemberRole({ appRole: "user", orgRole: "client_admin" })
		).toBe(false);
		expect(canUpdateMemberRole({ appRole: "user", orgRole: "member" })).toBe(
			false
		);
		expect(canUpdateMemberRole({})).toBe(false);
	});
});

describe("canInviteMembers vs canInviteWithAnyRole", () => {
	// Two questions, two layers. `canInviteMembers` mirrors who holds Better
	// Auth's `invitation` statements; `canInviteWithAnyRole` mirrors what
	// `beforeCreateInvitation` enforces on top. Gating both on the narrower one
	// hides a capability the server would honour — which is exactly the
	// regression these cases exist to prevent.
	it("lets client_admin invite, but not with a role above member", () => {
		const actor = { appRole: "user", orgRole: "client_admin" };

		expect(canInviteMembers(actor)).toBe(true);
		expect(canInviteWithAnyRole(actor)).toBe(false);
		expect(canInviteWithRole({ ...actor, role: "member" })).toBe(true);
		expect(canInviteWithRole({ ...actor, role: "nutritionist" })).toBe(false);
	});

	it("lets owner and direct_admin do both", () => {
		for (const orgRole of ["owner", "direct_admin"]) {
			const actor = { appRole: "user", orgRole };
			expect(canInviteMembers(actor)).toBe(true);
			expect(canInviteWithAnyRole(actor)).toBe(true);
		}
	});

	it("refuses roles that hold no invitation statements", () => {
		for (const orgRole of ["member", "nutritionist", "coach"]) {
			expect(canInviteMembers({ appRole: "user", orgRole })).toBe(false);
		}
	});

	it("lets an app admin invite regardless of organization role", () => {
		expect(canInviteMembers({ appRole: "admin", orgRole: null })).toBe(true);
	});
});
