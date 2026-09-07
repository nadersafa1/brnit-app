import { describe, expect, it } from "bun:test";

import {
	addDaysUTC,
	diffDaysInclusiveUTC,
	expandDateRangeInclusive,
	getTodayUtcDateString,
	isUtcDateString,
	maxDateString,
	minDateString,
	toDateStringUTC,
} from "./utc-date";

describe("isUtcDateString", () => {
	it("accepts well-formed calendar dates", () => {
		expect(isUtcDateString("2026-04-08")).toBe(true);
		expect(isUtcDateString("2024-02-29")).toBe(true);
	});

	it("rejects wrong shapes and impossible dates", () => {
		expect(isUtcDateString("2026-4-8")).toBe(false);
		expect(isUtcDateString("2026-04-08T00:00:00Z")).toBe(false);
		expect(isUtcDateString("2026-02-30")).toBe(false);
		expect(isUtcDateString("2026-13-01")).toBe(false);
		expect(isUtcDateString("")).toBe(false);
		expect(isUtcDateString(null)).toBe(false);
		expect(isUtcDateString(20_260_408)).toBe(false);
	});
});

describe("toDateStringUTC", () => {
	it("reads the UTC calendar day off a Date", () => {
		expect(toDateStringUTC(new Date("2026-04-08T23:59:59.999Z"))).toBe(
			"2026-04-08"
		);
		expect(toDateStringUTC(new Date("2026-04-09T00:00:00.000Z"))).toBe(
			"2026-04-09"
		);
	});

	it("passes a bare date string through unchanged", () => {
		expect(toDateStringUTC("2026-04-08")).toBe("2026-04-08");
	});

	it("converts an offset-bearing ISO string to UTC before taking the day", () => {
		// 01:30 EST is 06:30 UTC — same day.
		expect(toDateStringUTC("2026-03-08T01:30:00-05:00")).toBe("2026-03-08");
		// 20:00 PST is 04:00 UTC the next day.
		expect(toDateStringUTC("2026-11-01T20:00:00-08:00")).toBe("2026-11-02");
		// 00:30 CEST is 22:30 UTC the previous day.
		expect(toDateStringUTC("2026-07-15T00:30:00+02:00")).toBe("2026-07-14");
	});

	it("throws on unparseable input instead of returning NaN-NaN-NaN", () => {
		expect(() => toDateStringUTC("not-a-date")).toThrow();
		expect(() => toDateStringUTC(new Date("nope"))).toThrow();
	});
});

describe("addDaysUTC", () => {
	it("moves forward and backward by whole days", () => {
		expect(addDaysUTC("2026-04-08", 1)).toBe("2026-04-09");
		expect(addDaysUTC("2026-04-08", 6)).toBe("2026-04-14");
		expect(addDaysUTC("2026-04-08", -1)).toBe("2026-04-07");
		expect(addDaysUTC("2026-04-08", 0)).toBe("2026-04-08");
	});

	it("crosses month boundaries", () => {
		expect(addDaysUTC("2026-01-31", 1)).toBe("2026-02-01");
		expect(addDaysUTC("2026-03-01", -1)).toBe("2026-02-28");
		expect(addDaysUTC("2026-04-30", 1)).toBe("2026-05-01");
	});

	it("crosses year boundaries", () => {
		expect(addDaysUTC("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDaysUTC("2027-01-01", -1)).toBe("2026-12-31");
		expect(addDaysUTC("2026-12-25", 10)).toBe("2027-01-04");
	});

	it("handles February in leap and common years", () => {
		expect(addDaysUTC("2024-02-28", 1)).toBe("2024-02-29");
		expect(addDaysUTC("2024-02-29", 1)).toBe("2024-03-01");
		expect(addDaysUTC("2026-02-28", 1)).toBe("2026-03-01");
	});

	it("is unaffected by DST transitions (UTC has none)", () => {
		// US spring-forward: 2026-03-08 is a 23-hour day in America/*.
		expect(addDaysUTC("2026-03-07", 1)).toBe("2026-03-08");
		expect(addDaysUTC("2026-03-08", 1)).toBe("2026-03-09");
		// US fall-back: 2026-11-01 is a 25-hour day in America/*.
		expect(addDaysUTC("2026-10-31", 1)).toBe("2026-11-01");
		expect(addDaysUTC("2026-11-01", 1)).toBe("2026-11-02");
		// EU transitions: 2026-03-29 and 2026-10-25.
		expect(addDaysUTC("2026-03-28", 1)).toBe("2026-03-29");
		expect(addDaysUTC("2026-10-24", 1)).toBe("2026-10-25");
		expect(addDaysUTC("2026-10-25", 1)).toBe("2026-10-26");
	});

	it("rejects input that is not a YYYY-MM-DD date", () => {
		expect(() => addDaysUTC("2026-04-08T00:00:00Z", 1)).toThrow();
		expect(() => addDaysUTC("2026-02-30", 1)).toThrow();
	});
});

describe("getTodayUtcDateString", () => {
	it("returns the current UTC calendar day", () => {
		const before = new Date().toISOString().slice(0, 10);
		const today = getTodayUtcDateString();
		const after = new Date().toISOString().slice(0, 10);

		expect(isUtcDateString(today)).toBe(true);
		expect([before, after]).toContain(today);
	});
});

describe("maxDateString / minDateString", () => {
	it("orders lexicographically, which is chronological for YYYY-MM-DD", () => {
		expect(maxDateString("2026-04-08", "2026-04-09")).toBe("2026-04-09");
		expect(maxDateString("2026-04-09", "2026-04-08")).toBe("2026-04-09");
		expect(minDateString("2026-04-08", "2026-04-09")).toBe("2026-04-08");
		expect(minDateString("2026-04-09", "2026-04-08")).toBe("2026-04-08");
	});

	it("compares across month and year boundaries", () => {
		expect(maxDateString("2026-09-30", "2026-10-01")).toBe("2026-10-01");
		expect(maxDateString("2026-12-31", "2027-01-01")).toBe("2027-01-01");
		expect(minDateString("2026-12-31", "2027-01-01")).toBe("2026-12-31");
	});

	it("returns the shared value when both are equal", () => {
		expect(maxDateString("2026-04-08", "2026-04-08")).toBe("2026-04-08");
		expect(minDateString("2026-04-08", "2026-04-08")).toBe("2026-04-08");
	});
});

describe("diffDaysInclusiveUTC", () => {
	it("counts both endpoints (plan day 1 is the assignment start date)", () => {
		expect(diffDaysInclusiveUTC("2026-04-08", "2026-04-08")).toBe(1);
		expect(diffDaysInclusiveUTC("2026-04-08", "2026-04-09")).toBe(2);
		expect(diffDaysInclusiveUTC("2026-04-08", "2026-04-14")).toBe(7);
	});

	it("counts across month and year boundaries", () => {
		expect(diffDaysInclusiveUTC("2026-01-31", "2026-02-01")).toBe(2);
		expect(diffDaysInclusiveUTC("2026-12-30", "2027-01-02")).toBe(4);
		expect(diffDaysInclusiveUTC("2026-01-01", "2026-12-31")).toBe(365);
		expect(diffDaysInclusiveUTC("2024-01-01", "2024-12-31")).toBe(366);
		expect(diffDaysInclusiveUTC("2024-02-01", "2024-03-01")).toBe(30);
	});

	it("is unaffected by DST transitions in either direction", () => {
		expect(diffDaysInclusiveUTC("2026-03-07", "2026-03-09")).toBe(3);
		expect(diffDaysInclusiveUTC("2026-10-31", "2026-11-02")).toBe(3);
		expect(diffDaysInclusiveUTC("2026-10-24", "2026-10-26")).toBe(3);
	});

	it("goes negative-leaning when the range is reversed", () => {
		expect(diffDaysInclusiveUTC("2026-04-09", "2026-04-08")).toBe(0);
		expect(diffDaysInclusiveUTC("2026-04-14", "2026-04-08")).toBe(-5);
	});
});

describe("expandDateRangeInclusive", () => {
	it("includes both endpoints", () => {
		expect(expandDateRangeInclusive("2026-04-08", "2026-04-11")).toEqual([
			"2026-04-08",
			"2026-04-09",
			"2026-04-10",
			"2026-04-11",
		]);
	});

	it("returns a single-element range for one day", () => {
		expect(expandDateRangeInclusive("2026-04-08", "2026-04-08")).toEqual([
			"2026-04-08",
		]);
	});

	it("returns an empty range when the end precedes the start", () => {
		expect(expandDateRangeInclusive("2026-04-09", "2026-04-08")).toEqual([]);
	});

	it("crosses month, year and leap-day boundaries", () => {
		expect(expandDateRangeInclusive("2026-01-30", "2026-02-02")).toEqual([
			"2026-01-30",
			"2026-01-31",
			"2026-02-01",
			"2026-02-02",
		]);
		expect(expandDateRangeInclusive("2026-12-30", "2027-01-02")).toEqual([
			"2026-12-30",
			"2026-12-31",
			"2027-01-01",
			"2027-01-02",
		]);
		expect(expandDateRangeInclusive("2024-02-27", "2024-03-01")).toEqual([
			"2024-02-27",
			"2024-02-28",
			"2024-02-29",
			"2024-03-01",
		]);
	});

	it("emits exactly one entry per day across DST transitions", () => {
		expect(expandDateRangeInclusive("2026-03-07", "2026-03-09")).toEqual([
			"2026-03-07",
			"2026-03-08",
			"2026-03-09",
		]);
		expect(expandDateRangeInclusive("2026-10-31", "2026-11-02")).toEqual([
			"2026-10-31",
			"2026-11-01",
			"2026-11-02",
		]);
		expect(expandDateRangeInclusive("2026-10-24", "2026-10-26")).toEqual([
			"2026-10-24",
			"2026-10-25",
			"2026-10-26",
		]);
	});

	it("stays consistent with diffDaysInclusiveUTC over a week", () => {
		const from = "2026-04-08";
		const to = addDaysUTC(from, 6);
		expect(expandDateRangeInclusive(from, to)).toHaveLength(
			diffDaysInclusiveUTC(from, to)
		);
	});
});
