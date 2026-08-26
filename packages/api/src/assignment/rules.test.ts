import { describe, expect, it } from "bun:test";

import { HttpError } from "../http-error";
import type {
	AssigneePoolLoader,
	AssignmentDateRange,
	OrganizationScopeProbe,
} from "./rules";
import {
	assertAssignmentVisibleToScope,
	assertNoOverlappingAssignment,
	assignmentBelongsToUser,
	dateRangesOverlap,
	findOverlappingAssignment,
} from "./rules";

const MARCH = {
	endDate: "2026-03-31",
	startDate: "2026-03-01",
};

function assignment(
	id: string,
	startDate: string,
	endDate: string
): AssignmentDateRange {
	return { endDate, id, startDate };
}

describe("dateRangesOverlap", () => {
	it("detects a shared middle", () => {
		expect(
			dateRangesOverlap(MARCH, {
				endDate: "2026-03-20",
				startDate: "2026-03-10",
			})
		).toBe(true);
	});

	it("counts a single shared day at either edge", () => {
		expect(
			dateRangesOverlap(MARCH, {
				endDate: "2026-03-01",
				startDate: "2026-02-01",
			})
		).toBe(true);
		expect(
			dateRangesOverlap(MARCH, {
				endDate: "2026-04-30",
				startDate: "2026-03-31",
			})
		).toBe(true);
	});

	it("rejects ranges that only touch across the boundary", () => {
		expect(
			dateRangesOverlap(MARCH, {
				endDate: "2026-02-28",
				startDate: "2026-02-01",
			})
		).toBe(false);
		expect(
			dateRangesOverlap(MARCH, {
				endDate: "2026-04-30",
				startDate: "2026-04-01",
			})
		).toBe(false);
	});

	it("treats a one-day range as overlapping itself", () => {
		const day = { endDate: "2026-03-15", startDate: "2026-03-15" };
		expect(dateRangesOverlap(day, day)).toBe(true);
	});
});

describe("findOverlappingAssignment", () => {
	const rows = [
		assignment("a", "2026-01-01", "2026-01-31"),
		assignment("b", "2026-03-01", "2026-03-31"),
	];

	it("finds the colliding row", () => {
		expect(
			findOverlappingAssignment(rows, {
				endDate: "2026-03-05",
				startDate: "2026-03-05",
			})?.id
		).toBe("b");
	});

	it("returns undefined when the window is free", () => {
		expect(
			findOverlappingAssignment(rows, {
				endDate: "2026-02-28",
				startDate: "2026-02-01",
			})
		).toBeUndefined();
	});

	it("ignores the assignment being edited", () => {
		expect(findOverlappingAssignment(rows, MARCH, "b")).toBeUndefined();
	});

	it("still reports a different assignment when one is excluded", () => {
		const crowded = [...rows, assignment("c", "2026-03-10", "2026-03-12")];
		expect(findOverlappingAssignment(crowded, MARCH, "b")?.id).toBe("c");
	});

	it("does not treat a null exclusion as matching a row", () => {
		expect(findOverlappingAssignment(rows, MARCH, null)?.id).toBe("b");
	});
});

describe("assertNoOverlappingAssignment", () => {
	function loaderFor(
		memberIds: string[],
		rows: AssignmentDateRange[]
	): {
		calls: { memberIds: readonly string[]; userId: string }[];
	} & AssigneePoolLoader {
		const calls: { memberIds: readonly string[]; userId: string }[] = [];
		return {
			calls,
			listAssignments: (userId, ids) => {
				calls.push({ memberIds: ids, userId });
				return Promise.resolve(rows);
			},
			listMemberIds: () => Promise.resolve(memberIds),
		};
	}

	it("widens the probe to every membership the user holds, across organizations", async () => {
		const loader = loaderFor(["member_org_a", "member_org_b"], []);

		await assertNoOverlappingAssignment(
			{ assigneeUserId: "user_1", range: MARCH },
			loader
		);

		expect(loader.calls).toHaveLength(1);
		expect(loader.calls[0]?.userId).toBe("user_1");
		expect(loader.calls[0]?.memberIds).toEqual([
			"member_org_a",
			"member_org_b",
		]);
	});

	it("rejects with 409 when the pool already covers a day in the range", async () => {
		const loader = loaderFor(
			["member_org_b"],
			[assignment("existing", "2026-03-25", "2026-04-10")]
		);

		const thrown = await assertNoOverlappingAssignment(
			{ assigneeUserId: "user_1", range: MARCH },
			loader
		).catch((err: unknown) => err);

		expect(thrown).toBeInstanceOf(HttpError);
		expect((thrown as HttpError).status).toBe(409);
	});

	it("lets an update keep its own window", async () => {
		const loader = loaderFor(
			["member_org_a"],
			[assignment("self", "2026-03-01", "2026-03-31")]
		);

		await assertNoOverlappingAssignment(
			{
				assigneeUserId: "user_1",
				excludeAssignmentId: "self",
				range: { endDate: "2026-04-15", startDate: "2026-03-15" },
			},
			loader
		);
	});

	it("still rejects an update that collides with a different assignment", async () => {
		const loader = loaderFor(
			["member_org_a"],
			[
				assignment("self", "2026-03-01", "2026-03-31"),
				assignment("other", "2026-04-01", "2026-04-30"),
			]
		);

		const thrown = await assertNoOverlappingAssignment(
			{
				assigneeUserId: "user_1",
				excludeAssignmentId: "self",
				range: { endDate: "2026-04-15", startDate: "2026-03-15" },
			},
			loader
		).catch((err: unknown) => err);

		expect((thrown as HttpError).status).toBe(409);
	});

	it("probes with an empty membership list when the user has none", async () => {
		const loader = loaderFor([], []);

		await assertNoOverlappingAssignment(
			{ assigneeUserId: "user_1", range: MARCH },
			loader
		);

		expect(loader.calls[0]?.memberIds).toEqual([]);
	});
});

describe("assignmentBelongsToUser", () => {
	const USER = "user_1";

	it("accepts a directly assigned row", () => {
		expect(
			assignmentBelongsToUser({ memberId: null, userId: USER }, USER, new Set())
		).toBe(true);
	});

	it("accepts a row assigned through one of the caller's memberships", () => {
		expect(
			assignmentBelongsToUser(
				{ memberId: "member_org_b", userId: null },
				USER,
				new Set(["member_org_a", "member_org_b"])
			)
		).toBe(true);
	});

	it("rejects a membership belonging to somebody else", () => {
		expect(
			assignmentBelongsToUser(
				{ memberId: "member_other", userId: null },
				USER,
				new Set(["member_org_a"])
			)
		).toBe(false);
	});

	it("rejects another user's direct assignment", () => {
		expect(
			assignmentBelongsToUser(
				{ memberId: null, userId: "user_2" },
				USER,
				new Set(["member_org_a"])
			)
		).toBe(false);
	});

	it("rejects a row with neither assignee set", () => {
		expect(
			assignmentBelongsToUser(
				{ memberId: null, userId: null },
				USER,
				new Set(["member_org_a"])
			)
		).toBe(false);
	});
});

describe("assertAssignmentVisibleToScope", () => {
	function probeFor(visible: boolean): {
		calls: { assignmentId: string; organizationId: string }[];
	} & OrganizationScopeProbe {
		const calls: { assignmentId: string; organizationId: string }[] = [];
		return {
			assignmentBelongsToOrganization: (assignmentId, organizationId) => {
				calls.push({ assignmentId, organizationId });
				return Promise.resolve(visible);
			},
			calls,
		};
	}

	it("passes an in-organization assignment", async () => {
		const probe = probeFor(true);

		await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				scope: { isAppAdmin: false, organizationId: "org_a" },
			},
			probe
		);

		expect(probe.calls).toEqual([
			{ assignmentId: "assignment_1", organizationId: "org_a" },
		]);
	});

	it("lets an app admin through without probing at all", async () => {
		const probe = probeFor(false);

		await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				scope: { isAppAdmin: true, organizationId: null },
			},
			probe
		);

		expect(probe.calls).toEqual([]);
	});

	it("keeps the app-admin bypass even when they do have an active organization", async () => {
		const probe = probeFor(false);

		await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				scope: { isAppAdmin: true, organizationId: "org_a" },
			},
			probe
		);

		expect(probe.calls).toEqual([]);
	});

	it("answers 404, not 403, for an assignment in another organization", async () => {
		const thrown = await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				scope: { isAppAdmin: false, organizationId: "org_a" },
			},
			probeFor(false)
		).catch((err: unknown) => err);

		expect(thrown).toBeInstanceOf(HttpError);
		expect((thrown as HttpError).status).toBe(404);
		expect((thrown as HttpError).message).toBe("Assignment not found");
	});

	it("uses the caller's own not-found wording when given one", async () => {
		const thrown = await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				notFoundMessage: "Consumption not found",
				scope: { isAppAdmin: false, organizationId: "org_a" },
			},
			probeFor(false)
		).catch((err: unknown) => err);

		expect((thrown as HttpError).status).toBe(404);
		expect((thrown as HttpError).message).toBe("Consumption not found");
	});

	it("rejects a non-admin with no active organization before probing", async () => {
		const probe = probeFor(true);

		const thrown = await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				scope: { isAppAdmin: false, organizationId: null },
			},
			probe
		).catch((err: unknown) => err);

		expect((thrown as HttpError).status).toBe(403);
		expect((thrown as HttpError).message).toBe("Active organization required");
		expect(probe.calls).toEqual([]);
	});

	it("uses the caller's own no-organization wording when given one", async () => {
		const thrown = await assertAssignmentVisibleToScope(
			{
				assignmentId: "assignment_1",
				noOrganizationMessage: "Active organization required for listing",
				scope: { isAppAdmin: false, organizationId: null },
			},
			probeFor(true)
		).catch((err: unknown) => err);

		expect((thrown as HttpError).status).toBe(403);
		expect((thrown as HttpError).message).toBe(
			"Active organization required for listing"
		);
	});
});
