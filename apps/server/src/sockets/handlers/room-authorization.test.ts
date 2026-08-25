import { describe, expect, it } from "bun:test";

import {
	isOrganizationStaffRole,
	resolveRoomJoinDecision,
} from "./room-authorization.js";

const memberActor = { id: "usr_1", role: "user" };
const appAdmin = { id: "usr_admin", role: "admin" };

describe("isOrganizationStaffRole", () => {
	it.each([
		"owner",
		"client_admin",
		"direct_admin",
		"nutritionist",
		"coach",
	])("accepts_%s", (role) => {
		expect(isOrganizationStaffRole(role)).toBe(true);
	});

	it.each([
		{ name: "the plain participant role", role: "member" },
		{ name: "an unknown role", role: "superuser" },
		{ name: "null", role: null },
		{ name: "undefined", role: undefined },
	])("rejects_$name", ({ role }) => {
		expect(isOrganizationStaffRole(role)).toBe(false);
	});
});

describe("resolveRoomJoinDecision", () => {
	it("allows_a_user_into_their_own_room", () => {
		expect(resolveRoomJoinDecision("user:usr_1", memberActor)).toEqual({
			kind: "allow",
		});
	});

	it("forbids_a_user_from_another_users_room", () => {
		expect(resolveRoomJoinDecision("user:usr_2", memberActor)).toEqual({
			kind: "deny",
			code: "FORBIDDEN",
		});
	});

	it("gives_an_app_admin_no_bypass_on_a_user_room", () => {
		expect(resolveRoomJoinDecision("user:usr_1", appAdmin)).toEqual({
			kind: "deny",
			code: "FORBIDDEN",
		});
	});

	it("allows_an_app_admin_into_any_organization_room", () => {
		expect(resolveRoomJoinDecision("org:org_1", appAdmin)).toEqual({
			kind: "allow",
		});
	});

	it("defers_an_organization_room_to_a_membership_check", () => {
		expect(resolveRoomJoinDecision("org:org_1", memberActor)).toEqual({
			kind: "requires-organization-staff",
			organizationId: "org_1",
		});
	});

	it.each([
		{ name: "an unknown prefix", room: "venue:org_1" },
		{ name: "an empty organization id", room: "org:" },
		{ name: "an empty user id", room: "user:" },
		{ name: "an unprefixed string", room: "org_1" },
	])("rejects_$name_as_invalid", ({ room }) => {
		expect(resolveRoomJoinDecision(room, memberActor)).toEqual({
			kind: "deny",
			code: "INVALID_ROOM",
		});
	});
});
