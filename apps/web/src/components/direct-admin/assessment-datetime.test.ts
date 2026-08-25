import { describe, expect, it } from "bun:test";

import {
	assessedAtInputToIso,
	formatAssessedAt,
	isoToAssessedAtInput,
	nowAssessedAtInput,
	parseAssessedAt,
} from "./assessment-datetime";

const DATETIME_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

describe("parseAssessedAt", () => {
	it("reads the instant an ISO string names", () => {
		expect(parseAssessedAt("2026-04-08T21:30:00.000Z")?.getTime()).toBe(
			Date.UTC(2026, 3, 8, 21, 30, 0, 0)
		);
	});

	it("accepts an ISO string without a fractional part", () => {
		expect(parseAssessedAt("2026-04-08T21:30:00Z")?.getTime()).toBe(
			Date.UTC(2026, 3, 8, 21, 30)
		);
	});

	it("rejects anything that is not a UTC ISO instant", () => {
		expect(parseAssessedAt("2026-04-08")).toBeNull();
		expect(parseAssessedAt("2026-04-08T21:30")).toBeNull();
		expect(parseAssessedAt("")).toBeNull();
	});
});

describe("assessedAtInputToIso", () => {
	it("reads the control value as local wall-clock time", () => {
		const iso = assessedAtInputToIso("2026-04-08T21:30");
		expect(iso).toBe(new Date(2026, 3, 8, 21, 30).toISOString());
	});

	it("tolerates the seconds some browsers append", () => {
		expect(assessedAtInputToIso("2026-04-08T21:30:00")).toBe(
			new Date(2026, 3, 8, 21, 30).toISOString()
		);
	});

	it("passes malformed input through for the schema to reject", () => {
		expect(assessedAtInputToIso("not-a-date")).toBe("not-a-date");
		expect(assessedAtInputToIso("")).toBe("");
	});
});

describe("isoToAssessedAtInput", () => {
	it("round-trips a control value through the wire format", () => {
		const original = "2026-04-08T21:30";
		expect(isoToAssessedAtInput(assessedAtInputToIso(original))).toBe(original);
	});

	it("is blank for an unreadable instant, so the field means 'unchanged'", () => {
		expect(isoToAssessedAtInput("nonsense")).toBe("");
	});
});

describe("nowAssessedAtInput", () => {
	it("produces a value the control accepts", () => {
		expect(nowAssessedAtInput()).toMatch(DATETIME_LOCAL);
	});
});

describe("formatAssessedAt", () => {
	it("falls back to a dash rather than printing Invalid Date", () => {
		expect(formatAssessedAt("nonsense")).toBe("—");
	});

	it("formats a real instant", () => {
		expect(formatAssessedAt("2026-04-08T21:30:00.000Z")).toBe(
			new Date(Date.UTC(2026, 3, 8, 21, 30)).toLocaleString()
		);
	});
});
