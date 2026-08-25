import { describe, expect, it } from "bun:test";

// `@brnit/env/server` validates at import time; these placeholders let the
// module graph load in a shell with no `.env`.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";

const { calculateConsumptionStreak } = await import("./consumption-streak");

const TODAY = "2026-03-10";

describe("calculateConsumptionStreak", () => {
	it("is 0 when nothing was ever logged", () => {
		expect(calculateConsumptionStreak(new Set(), TODAY)).toBe(0);
	});

	it("breaks immediately when today has no logged meal", () => {
		// A perfect week ending yesterday still scores 0 — the streak has to
		// include today.
		const dates = new Set([
			"2026-03-04",
			"2026-03-05",
			"2026-03-06",
			"2026-03-07",
			"2026-03-08",
			"2026-03-09",
		]);

		expect(calculateConsumptionStreak(dates, TODAY)).toBe(0);
	});

	it("counts a single logged day", () => {
		expect(calculateConsumptionStreak(new Set([TODAY]), TODAY)).toBe(1);
	});

	it("walks back over consecutive days", () => {
		const dates = new Set([
			"2026-03-07",
			"2026-03-08",
			"2026-03-09",
			"2026-03-10",
		]);

		expect(calculateConsumptionStreak(dates, TODAY)).toBe(4);
	});

	it("stops at the first gap and ignores older runs", () => {
		const dates = new Set([
			// Older run, unreachable across the 2026-03-07 gap.
			"2026-03-01",
			"2026-03-02",
			"2026-03-03",
			"2026-03-08",
			"2026-03-09",
			"2026-03-10",
		]);

		expect(calculateConsumptionStreak(dates, TODAY)).toBe(3);
	});

	it("crosses month boundaries", () => {
		const dates = new Set(["2026-02-28", "2026-03-01"]);

		expect(calculateConsumptionStreak(dates, "2026-03-01")).toBe(2);
	});

	it("crosses a leap day", () => {
		const dates = new Set(["2028-02-28", "2028-02-29", "2028-03-01"]);

		expect(calculateConsumptionStreak(dates, "2028-03-01")).toBe(3);
	});
});
