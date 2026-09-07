import { describe, expect, it } from "bun:test";

import { parseAdminUsersSearch } from "./admin-users-search";

function parse(search: Record<string, unknown>) {
	return parseAdminUsersSearch(
		search as Parameters<typeof parseAdminUsersSearch>[0]
	);
}

describe("parseAdminUsersSearch", () => {
	it("opens newest-first with no role filter", () => {
		expect(parse({})).toEqual({
			page: 1,
			perPage: 25,
			q: "",
			role: "",
			sortBy: "createdAt",
			sortOrder: "desc",
		});
	});

	it("keeps every app role", () => {
		for (const role of ["admin", "nutritionist", "coach", "user"]) {
			expect(parse({ role }).role).toBe(role);
		}
	});

	it("treats an unknown role as no filter at all", () => {
		expect(parse({ role: "wizard" }).role).toBe("");
		expect(parse({ role: 7 }).role).toBe("");
	});

	it("falls back on a sort column better-auth cannot order by", () => {
		expect(parse({ sortBy: "banned" }).sortBy).toBe("createdAt");
		expect(parse({ sortBy: "email" }).sortBy).toBe("email");
	});
});
