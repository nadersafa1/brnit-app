import { describe, expect, it } from "bun:test";
import { adminAc } from "better-auth/plugins/organization/access";

import {
	client_admin,
	coach,
	direct_admin,
	member,
	nutritionist,
	owner,
} from "./permissions";

/**
 * The access-control layer runs *before* `beforeCreateInvitation`, so a role
 * listed in `ORG_ROLES_CAN_INVITE` that lacks invitation statements here is
 * blocked outright and its branch in the hook never executes. These tests pin
 * the two layers together.
 */
describe("direct_admin invitation statements", () => {
	it("is not empty", () => {
		expect(direct_admin.statements.invitation.length).toBeGreaterThan(0);
	});

	it("matches the org admin statements it inherits from", () => {
		expect(direct_admin.statements.invitation).toEqual(
			adminAc.statements.invitation
		);
	});

	it("authorizes creating and cancelling invitations", () => {
		expect(direct_admin.authorize({ invitation: ["create"] }).success).toBe(
			true
		);
		expect(direct_admin.authorize({ invitation: ["cancel"] }).success).toBe(
			true
		);
	});

	it("still allows updating and removing members", () => {
		expect(
			direct_admin.authorize({ member: ["update", "delete"] }).success
		).toBe(true);
	});
});

describe("invitation statements across org roles", () => {
	it("grants invitation rights only to owner, client_admin and direct_admin", () => {
		for (const role of [owner, client_admin, direct_admin]) {
			expect(role.authorize({ invitation: ["create"] }).success).toBe(true);
		}
		for (const role of [nutritionist, coach, member]) {
			expect(role.authorize({ invitation: ["create"] }).success).toBe(false);
		}
	});
});
