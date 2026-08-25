import { describe, expect, it } from "bun:test";

import {
	buildEffectiveDatesForScope,
	dedupeAndSortDateStrings,
	findOverrideRowCoveringDate,
	mergeEffectiveDates,
	normalizeOverrideScopeWindow,
	parseEffectiveDates,
	planOverrideDateRemoval,
	planOverrideWrite,
	removeDateFromEffectiveDates,
} from "./override-dates";

const TODAY = "2026-04-10";

describe("dedupeAndSortDateStrings", () => {
	it("removes duplicates and orders chronologically", () => {
		expect(
			dedupeAndSortDateStrings([
				"2026-04-10",
				"2026-04-02",
				"2026-04-10",
				"2026-03-31",
			])
		).toEqual(["2026-03-31", "2026-04-02", "2026-04-10"]);
	});

	it("returns an empty array unchanged", () => {
		expect(dedupeAndSortDateStrings([])).toEqual([]);
	});
});

describe("parseEffectiveDates", () => {
	it("normalizes a stored array", () => {
		expect(parseEffectiveDates(["2026-04-02", "2026-04-01", "2026-04-02"])).toEqual(
			["2026-04-01", "2026-04-02"]
		);
	});

	it("drops non-string entries rather than trusting the jsonb column", () => {
		expect(parseEffectiveDates(["2026-04-01", 42, null, { a: 1 }])).toEqual([
			"2026-04-01",
		]);
	});

	it("treats anything that is not an array as empty", () => {
		expect(parseEffectiveDates(null)).toEqual([]);
		expect(parseEffectiveDates(undefined)).toEqual([]);
		expect(parseEffectiveDates("2026-04-01")).toEqual([]);
	});
});

describe("normalizeOverrideScopeWindow", () => {
	it("keeps a single_day window exactly as asked, including in the past", () => {
		expect(
			normalizeOverrideScopeWindow(
				{ scope: "single_day", startDate: "2026-04-01" },
				TODAY
			)
		).toEqual({ scope: "single_day", startDate: "2026-04-01" });
	});

	it("never lets rest_of_plan backdate below today", () => {
		expect(
			normalizeOverrideScopeWindow(
				{ scope: "rest_of_plan", startDate: "2026-03-01" },
				TODAY
			)
		).toEqual({ scope: "rest_of_plan", startDate: TODAY });
	});

	it("keeps a future rest_of_plan start", () => {
		expect(
			normalizeOverrideScopeWindow(
				{ scope: "rest_of_plan", startDate: "2026-04-20" },
				TODAY
			)
		).toEqual({ scope: "rest_of_plan", startDate: "2026-04-20" });
	});

	it("keeps today itself when rest_of_plan starts today", () => {
		expect(
			normalizeOverrideScopeWindow(
				{ scope: "rest_of_plan", startDate: TODAY },
				TODAY
			).startDate
		).toBe(TODAY);
	});
});

describe("buildEffectiveDatesForScope", () => {
	it("covers exactly one day for single_day", () => {
		expect(
			buildEffectiveDatesForScope(
				{ scope: "single_day", startDate: "2026-04-01" },
				"2026-04-30"
			)
		).toEqual(["2026-04-01"]);
	});

	it("covers a single_day even beyond the assignment's end", () => {
		expect(
			buildEffectiveDatesForScope(
				{ scope: "single_day", startDate: "2026-05-05" },
				"2026-04-30"
			)
		).toEqual(["2026-05-05"]);
	});

	it("expands rest_of_plan inclusively through the assignment end", () => {
		expect(
			buildEffectiveDatesForScope(
				{ scope: "rest_of_plan", startDate: "2026-04-28" },
				"2026-04-30"
			)
		).toEqual(["2026-04-28", "2026-04-29", "2026-04-30"]);
	});

	it("covers the final day when rest_of_plan starts on it", () => {
		expect(
			buildEffectiveDatesForScope(
				{ scope: "rest_of_plan", startDate: "2026-04-30" },
				"2026-04-30"
			)
		).toEqual(["2026-04-30"]);
	});

	it("covers nothing when rest_of_plan starts after the assignment ends", () => {
		expect(
			buildEffectiveDatesForScope(
				{ scope: "rest_of_plan", startDate: "2026-05-01" },
				"2026-04-30"
			)
		).toEqual([]);
	});

	it("does not backdate a rest_of_plan that started before today", () => {
		const window = normalizeOverrideScopeWindow(
			{ scope: "rest_of_plan", startDate: "2026-01-01" },
			TODAY
		);
		const dates = buildEffectiveDatesForScope(window, "2026-04-12");
		expect(dates).toEqual(["2026-04-10", "2026-04-11", "2026-04-12"]);
	});
});

describe("mergeEffectiveDates", () => {
	it("keeps days the existing row already covered", () => {
		expect(
			mergeEffectiveDates(["2026-04-01", "2026-04-02"], ["2026-04-05"])
		).toEqual(["2026-04-01", "2026-04-02", "2026-04-05"]);
	});

	it("does not duplicate an overlapping day", () => {
		expect(
			mergeEffectiveDates(["2026-04-01"], ["2026-04-01", "2026-04-02"])
		).toEqual(["2026-04-01", "2026-04-02"]);
	});

	it("returns the incoming set when there is nothing to merge with", () => {
		expect(mergeEffectiveDates([], ["2026-04-02", "2026-04-01"])).toEqual([
			"2026-04-01",
			"2026-04-02",
		]);
	});
});

describe("removeDateFromEffectiveDates", () => {
	it("drops the day and keeps the rest", () => {
		expect(
			removeDateFromEffectiveDates(
				["2026-04-01", "2026-04-02", "2026-04-03"],
				"2026-04-02"
			)
		).toEqual(["2026-04-01", "2026-04-03"]);
	});

	it("empties a single-day row so the caller can delete it", () => {
		expect(removeDateFromEffectiveDates(["2026-04-02"], "2026-04-02")).toEqual(
			[]
		);
	});

	it("returns null when the day was never covered", () => {
		expect(
			removeDateFromEffectiveDates(["2026-04-01"], "2026-04-02")
		).toBeNull();
	});

	it("returns null for an already empty set", () => {
		expect(removeDateFromEffectiveDates([], "2026-04-02")).toBeNull();
	});
});

describe("findOverrideRowCoveringDate", () => {
	const rowsNewestFirst = [
		{ effectiveDates: ["2026-04-02"], id: "newest" },
		{ effectiveDates: ["2026-04-01", "2026-04-02"], id: "older" },
	];

	it("picks the first covering row in newest-first order", () => {
		expect(findOverrideRowCoveringDate(rowsNewestFirst, "2026-04-02")?.id).toBe(
			"newest"
		);
	});

	it("falls through to an older row for a day the newest does not cover", () => {
		expect(findOverrideRowCoveringDate(rowsNewestFirst, "2026-04-01")?.id).toBe(
			"older"
		);
	});

	it("returns undefined when no row covers the day", () => {
		expect(
			findOverrideRowCoveringDate(rowsNewestFirst, "2026-04-09")
		).toBeUndefined();
	});

	it("tolerates a null date set", () => {
		expect(
			findOverrideRowCoveringDate(
				[{ effectiveDates: null, id: "empty" }],
				"2026-04-01"
			)
		).toBeUndefined();
	});
});

describe("planOverrideWrite", () => {
	const incoming = ["2026-04-10", "2026-04-11"];

	it("inserts when the slot has no row for this food", () => {
		expect(planOverrideWrite({ effectiveDates: incoming })).toEqual({
			effectiveDates: incoming,
			kind: "insert",
		});
	});

	it("merges onto an existing slot+food row so earlier days survive", () => {
		const plan = planOverrideWrite({
			effectiveDates: ["2026-04-20"],
			existingForFood: {
				effectiveDates: ["2026-04-01", "2026-04-02"],
				id: "row_1",
			},
		});

		expect(plan).toEqual({
			effectiveDates: ["2026-04-01", "2026-04-02", "2026-04-20"],
			id: "row_1",
			kind: "merge",
		});
	});

	it("replaces when the caller named a specific override row", () => {
		const plan = planOverrideWrite({
			effectiveDates: ["2026-04-20"],
			targetedRow: {
				effectiveDates: ["2026-04-01", "2026-04-02"],
				id: "row_1",
			},
		});

		expect(plan).toEqual({
			effectiveDates: ["2026-04-20"],
			id: "row_1",
			kind: "replace",
		});
	});

	it("prefers the targeted row over a slot+food match", () => {
		const plan = planOverrideWrite({
			effectiveDates: ["2026-04-20"],
			existingForFood: { effectiveDates: ["2026-04-01"], id: "by_food" },
			targetedRow: { effectiveDates: ["2026-04-02"], id: "by_id" },
		});

		expect(plan.kind).toBe("replace");
		expect(plan).toMatchObject({ id: "by_id" });
	});

	it("normalizes the incoming dates on every path", () => {
		expect(
			planOverrideWrite({
				effectiveDates: ["2026-04-11", "2026-04-10", "2026-04-11"],
			}).effectiveDates
		).toEqual(["2026-04-10", "2026-04-11"]);
	});

	it("tolerates a merge target whose date set is null", () => {
		const plan = planOverrideWrite({
			effectiveDates: ["2026-04-10"],
			existingForFood: { effectiveDates: null, id: "row_1" },
		});

		expect(plan).toEqual({
			effectiveDates: ["2026-04-10"],
			id: "row_1",
			kind: "merge",
		});
	});
});

describe("planOverrideDateRemoval", () => {
	it("shrinks a row that still covers other days", () => {
		expect(
			planOverrideDateRemoval(
				[{ effectiveDates: ["2026-04-01", "2026-04-02"], id: "row_1" }],
				"2026-04-01"
			)
		).toEqual({
			effectiveDates: ["2026-04-02"],
			id: "row_1",
			kind: "shrink",
		});
	});

	it("deletes the row once its last day is removed", () => {
		expect(
			planOverrideDateRemoval(
				[{ effectiveDates: ["2026-04-01"], id: "row_1" }],
				"2026-04-01"
			)
		).toEqual({ id: "row_1", kind: "delete-row" });
	});

	it("takes the day from the newest row covering it", () => {
		const plan = planOverrideDateRemoval(
			[
				{ effectiveDates: ["2026-04-01"], id: "newest" },
				{ effectiveDates: ["2026-04-01", "2026-04-02"], id: "older" },
			],
			"2026-04-01"
		);

		expect(plan).toEqual({ id: "newest", kind: "delete-row" });
	});

	it("leaves the older row serving the days the newest never covered", () => {
		const plan = planOverrideDateRemoval(
			[
				{ effectiveDates: ["2026-04-01"], id: "newest" },
				{ effectiveDates: ["2026-04-01", "2026-04-02"], id: "older" },
			],
			"2026-04-02"
		);

		expect(plan).toEqual({
			effectiveDates: ["2026-04-01"],
			id: "older",
			kind: "shrink",
		});
	});

	it("returns null when no row covers the day", () => {
		expect(
			planOverrideDateRemoval(
				[{ effectiveDates: ["2026-04-01"], id: "row_1" }],
				"2026-04-09"
			)
		).toBeNull();
	});

	it("returns null for an empty slot", () => {
		expect(planOverrideDateRemoval([], "2026-04-01")).toBeNull();
	});
});
