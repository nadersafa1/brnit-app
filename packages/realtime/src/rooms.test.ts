import { describe, expect, it } from "bun:test";

import {
	organizationRoom,
	parseOrganizationRoom,
	parseUserRoom,
	userRoom,
} from "./rooms";

describe("userRoom / parseUserRoom", () => {
	it("round_trips_a_user_id", () => {
		expect(parseUserRoom(userRoom("usr_1"))).toEqual({ userId: "usr_1" });
	});

	it("keeps_colons_inside_the_id", () => {
		expect(parseUserRoom(userRoom("usr:1"))).toEqual({ userId: "usr:1" });
	});

	it.each([
		{ name: "an organization room", room: "org:org_1" },
		{ name: "an empty id", room: "user:" },
		{ name: "an unprefixed string", room: "usr_1" },
	])("rejects_$name", ({ room }) => {
		expect(parseUserRoom(room)).toBeNull();
	});
});

describe("organizationRoom / parseOrganizationRoom", () => {
	it("round_trips_an_organization_id", () => {
		expect(parseOrganizationRoom(organizationRoom("org_1"))).toEqual({
			organizationId: "org_1",
		});
	});

	it.each([
		{ name: "a user room", room: "user:usr_1" },
		{ name: "an empty id", room: "org:" },
		{ name: "an unprefixed string", room: "org_1" },
	])("rejects_$name", ({ room }) => {
		expect(parseOrganizationRoom(room)).toBeNull();
	});
});
