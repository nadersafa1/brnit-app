import { describe, expect, it } from "bun:test";

import type { LeaderboardCandidate } from "./organization-leaderboard";

// `@brnit/env/server` validates at import time; these placeholders let the
// module graph load in a shell with no `.env`.
process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/brnit_test";
process.env.BETTER_AUTH_SECRET ??= "test-better-auth-secret-min-32-chars!!!!";
process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";
process.env.CORS_ORIGIN ??= "http://127.0.0.1:3000";

const {
	buildLeaderboardCandidates,
	buildLeaderboardSelf,
	rankLeaderboardCandidates,
} = await import("./organization-leaderboard");

function assessment(assessedAt: string, bodyFatPercent: string) {
	return { assessedAt: new Date(assessedAt), bodyFatPercent };
}

function candidate(
	overrides: Partial<LeaderboardCandidate> = {}
): LeaderboardCandidate {
	return {
		endAssessedAt: new Date("2026-03-01T00:00:00.000Z"),
		endBodyFatPercent: 20,
		fatLossPoints: 5,
		memberId: "mem-1",
		name: "Member One",
		startAssessedAt: new Date("2026-01-01T00:00:00.000Z"),
		startBodyFatPercent: 25,
		...overrides,
	};
}

describe("buildLeaderboardCandidates", () => {
	it("needs at least two assessments to compete", () => {
		const candidates = buildLeaderboardCandidates(
			[
				{ id: "mem-one", name: "One" },
				{ id: "mem-none", name: "None" },
			],
			new Map([
				["mem-one", [assessment("2026-01-01", "28")]],
				["mem-none", []],
			])
		);

		expect(candidates).toEqual([]);
	});

	it("measures the drop from the first assessment to the last", () => {
		const candidates = buildLeaderboardCandidates(
			[{ id: "mem-1", name: "Alice" }],
			new Map([
				[
					"mem-1",
					[
						assessment("2026-01-01", "28"),
						assessment("2026-02-01", "25.5"),
						assessment("2026-03-01", "22.8"),
					],
				],
			])
		);

		expect(candidates).toHaveLength(1);
		expect(candidates[0]?.startBodyFatPercent).toBe(28);
		expect(candidates[0]?.endBodyFatPercent).toBe(22.8);
		// Percentage points, positive when fat was lost.
		expect(candidates[0]?.fatLossPoints).toBeCloseTo(5.2, 10);
		expect(candidates[0]?.name).toBe("Alice");
	});

	it("is negative when body fat went up", () => {
		const candidates = buildLeaderboardCandidates(
			[{ id: "mem-1", name: "Alice" }],
			new Map([
				[
					"mem-1",
					[assessment("2026-01-01", "20"), assessment("2026-03-01", "23")],
				],
			])
		);

		expect(candidates[0]?.fatLossPoints).toBe(-3);
	});

	it("reads an unparseable body fat percentage as 0", () => {
		const candidates = buildLeaderboardCandidates(
			[{ id: "mem-1", name: "Alice" }],
			new Map([
				[
					"mem-1",
					[
						assessment("2026-01-01", "not-a-number"),
						assessment("2026-03-01", ""),
					],
				],
			])
		);

		expect(candidates[0]?.startBodyFatPercent).toBe(0);
		expect(candidates[0]?.endBodyFatPercent).toBe(0);
		expect(candidates[0]?.fatLossPoints).toBe(0);
	});
});

describe("rankLeaderboardCandidates", () => {
	it("ranks the biggest drop first", () => {
		const ranked = rankLeaderboardCandidates([
			candidate({ fatLossPoints: 1.5, memberId: "mem-small" }),
			candidate({ fatLossPoints: 6, memberId: "mem-big" }),
			candidate({ fatLossPoints: 3.2, memberId: "mem-mid" }),
		]);

		expect(ranked.map((entry) => entry.memberId)).toEqual([
			"mem-big",
			"mem-mid",
			"mem-small",
		]);
		expect(ranked.map((entry) => entry.rank)).toEqual([1, 2, 3]);
	});

	it("breaks a tie on the most recent latest assessment", () => {
		// Observed behaviour of the pre-overhaul comparator, preserved verbatim:
		// the member whose latest assessment is newer ranks higher.
		const ranked = rankLeaderboardCandidates([
			candidate({
				endAssessedAt: new Date("2026-01-15T00:00:00.000Z"),
				memberId: "mem-older",
			}),
			candidate({
				endAssessedAt: new Date("2026-06-15T00:00:00.000Z"),
				memberId: "mem-newer",
			}),
		]);

		expect(ranked.map((entry) => entry.memberId)).toEqual([
			"mem-newer",
			"mem-older",
		]);
	});

	it("falls back to memberId when the drop and the date both tie", () => {
		const sameDate = new Date("2026-03-01T00:00:00.000Z");
		const ranked = rankLeaderboardCandidates([
			candidate({ endAssessedAt: sameDate, memberId: "mem-b" }),
			candidate({ endAssessedAt: sameDate, memberId: "mem-a" }),
		]);

		expect(ranked.map((entry) => entry.memberId)).toEqual(["mem-a", "mem-b"]);
	});

	it("does not mutate the input array", () => {
		const candidates = [
			candidate({ fatLossPoints: 1, memberId: "mem-low" }),
			candidate({ fatLossPoints: 9, memberId: "mem-high" }),
		];
		rankLeaderboardCandidates(candidates);

		expect(candidates.map((entry) => entry.memberId)).toEqual([
			"mem-low",
			"mem-high",
		]);
	});
});

describe("buildLeaderboardSelf", () => {
	it("reports the caller's own rank when they compete", () => {
		const ranked = rankLeaderboardCandidates([
			candidate({ fatLossPoints: 9, memberId: "mem-other" }),
			candidate({ fatLossPoints: 4, memberId: "mem-me" }),
		]);

		expect(buildLeaderboardSelf(ranked, "mem-me")).toEqual({
			eligibility: "eligible",
			endAssessedAt: "2026-03-01T00:00:00.000Z",
			endBodyFatPercent: 20,
			fatLossPoints: 4,
			rank: 2,
			startAssessedAt: "2026-01-01T00:00:00.000Z",
			startBodyFatPercent: 25,
		});
	});

	it("returns the ineligible placeholder when the caller is not ranked", () => {
		expect(buildLeaderboardSelf([], "mem-me")).toEqual({
			eligibility: "not_enough_assessments",
			endAssessedAt: null,
			endBodyFatPercent: null,
			fatLossPoints: null,
			rank: null,
			startAssessedAt: null,
			startBodyFatPercent: null,
		});
	});
});
