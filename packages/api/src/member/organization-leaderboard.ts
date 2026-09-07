import { db } from "@brnit/db";
import { bodyCompositionAssessment, member, user } from "@brnit/db/schema";
import { ORGANIZATION_MEMBER_ROLE } from "@brnit/domain";
import { and, asc, eq, inArray } from "drizzle-orm";

import type {
	LeaderboardEntryDto,
	LeaderboardSelfDto,
	OrganizationLeaderboardDto,
} from "./dto";
import { LEADERBOARD_METRIC } from "./dto";
import type { MemberOrganizationScope } from "./member-access";

/**
 * `GET /member/me/organization-leaderboard` — body-fat percentage **points**
 * dropped between a member's first and latest assessment.
 *
 * Only org members whose role is exactly `member` compete; staff roles
 * (owner, direct_admin, nutritionist, coach) are excluded even when they have
 * assessments of their own.
 */

/** How many ranked entries the clients render. */
const TOP_COUNT = 3;

/** Minimum assessments before a member has a measurable change. */
const MIN_ASSESSMENTS = 2;

/** `user.name` is `NOT NULL`, but a missing joined row must still render. */
const DISPLAY_NAME_UNKNOWN = "Unknown";

interface AssessmentPoint {
	assessedAt: Date;
	bodyFatPercent: string;
}

export interface LeaderboardCandidate {
	endAssessedAt: Date;
	endBodyFatPercent: number;
	fatLossPoints: number;
	memberId: string;
	name: string;
	startAssessedAt: Date;
	startBodyFatPercent: number;
}

type RankedCandidate = LeaderboardCandidate & { rank: number };

/** DB `numeric` arrives as a string; anything unparseable ranks as 0. */
function parseBodyFatPercent(value: string | null | undefined): number {
	if (value === null || value === undefined || value === "") {
		return 0;
	}
	const parsed = Number.parseFloat(value);
	return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Ranking order: `fatLossPoints` descending, then — **as observed in the
 * pre-overhaul service** — the most recent latest assessment first, then
 * `memberId` ascending as a total-order tiebreak.
 *
 * The original comparator wrote this with its operands aliased in a way that
 * reads backwards (`const tA = b…; const tB = a…; return tA - tB`), and
 * `api-surface.md` §8.7 consequently describes the tiebreaker as inverted. It
 * is not: the comparator sorts newest-first, and that is preserved verbatim
 * here. Ranking is a published ordering, so changing it would silently
 * reshuffle every leaderboard.
 */
export function compareLeaderboardCandidates(
	left: LeaderboardCandidate,
	right: LeaderboardCandidate
): number {
	if (right.fatLossPoints !== left.fatLossPoints) {
		return right.fatLossPoints - left.fatLossPoints;
	}
	const byRecency =
		right.endAssessedAt.getTime() - left.endAssessedAt.getTime();
	if (byRecency !== 0) {
		return byRecency;
	}
	return left.memberId.localeCompare(right.memberId);
}

/** Sorts a copy and assigns 1-based ranks. */
export function rankLeaderboardCandidates(
	candidates: readonly LeaderboardCandidate[]
): RankedCandidate[] {
	return [...candidates]
		.sort(compareLeaderboardCandidates)
		.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function toEntryDto(candidate: RankedCandidate): LeaderboardEntryDto {
	return {
		endAssessedAt: candidate.endAssessedAt.toISOString(),
		endBodyFatPercent: candidate.endBodyFatPercent,
		fatLossPoints: candidate.fatLossPoints,
		memberId: candidate.memberId,
		name: candidate.name,
		rank: candidate.rank,
		startAssessedAt: candidate.startAssessedAt.toISOString(),
		startBodyFatPercent: candidate.startBodyFatPercent,
	};
}

/**
 * The requester's own row, or the ineligible placeholder when they have fewer
 * than two assessments (or are not a competing `member`).
 */
export function buildLeaderboardSelf(
	ranked: readonly RankedCandidate[],
	memberId: string
): LeaderboardSelfDto {
	const own = ranked.find((candidate) => candidate.memberId === memberId);
	if (!own) {
		return {
			eligibility: "not_enough_assessments",
			endAssessedAt: null,
			endBodyFatPercent: null,
			fatLossPoints: null,
			rank: null,
			startAssessedAt: null,
			startBodyFatPercent: null,
		};
	}
	return {
		eligibility: "eligible",
		endAssessedAt: own.endAssessedAt.toISOString(),
		endBodyFatPercent: own.endBodyFatPercent,
		fatLossPoints: own.fatLossPoints,
		rank: own.rank,
		startAssessedAt: own.startAssessedAt.toISOString(),
		startBodyFatPercent: own.startBodyFatPercent,
	};
}

/**
 * One candidate per member holding at least {@link MIN_ASSESSMENTS}
 * assessments: baseline is the earliest, latest is the most recent, and
 * `fatLossPoints` is `first - last`, so positive means fat lost.
 */
export function buildLeaderboardCandidates(
	members: readonly { id: string; name: string }[],
	assessmentsByMember: ReadonlyMap<string, AssessmentPoint[]>
): LeaderboardCandidate[] {
	const candidates: LeaderboardCandidate[] = [];

	for (const competitor of members) {
		const assessments = assessmentsByMember.get(competitor.id);
		const baseline = assessments?.[0];
		const latest = assessments?.at(-1);
		if (
			!(assessments && baseline && latest) ||
			assessments.length < MIN_ASSESSMENTS
		) {
			continue;
		}

		const startBodyFatPercent = parseBodyFatPercent(baseline.bodyFatPercent);
		const endBodyFatPercent = parseBodyFatPercent(latest.bodyFatPercent);
		candidates.push({
			endAssessedAt: latest.assessedAt,
			endBodyFatPercent,
			fatLossPoints: startBodyFatPercent - endBodyFatPercent,
			memberId: competitor.id,
			name: competitor.name,
			startAssessedAt: baseline.assessedAt,
			startBodyFatPercent,
		});
	}

	return candidates;
}

/** Competing members of the organization, with their display names. */
async function listCompetingMembers(
	organizationId: string
): Promise<{ id: string; name: string }[]> {
	const rows = await db
		.select({ id: member.id, name: user.name })
		.from(member)
		.leftJoin(user, eq(member.userId, user.id))
		.where(
			and(
				eq(member.organizationId, organizationId),
				eq(member.role, ORGANIZATION_MEMBER_ROLE)
			)
		);

	return rows.map((row) => ({
		id: row.id,
		name: row.name ?? DISPLAY_NAME_UNKNOWN,
	}));
}

/** All assessments for the competing members, grouped oldest-first per member. */
async function loadAssessmentsByMember(
	memberIds: readonly string[]
): Promise<Map<string, AssessmentPoint[]>> {
	const rows = await db
		.select({
			assessedAt: bodyCompositionAssessment.assessedAt,
			bodyFatPercent: bodyCompositionAssessment.bodyFatPercent,
			memberId: bodyCompositionAssessment.memberId,
		})
		.from(bodyCompositionAssessment)
		.where(inArray(bodyCompositionAssessment.memberId, [...memberIds]))
		.orderBy(
			asc(bodyCompositionAssessment.memberId),
			asc(bodyCompositionAssessment.assessedAt)
		);

	const grouped = new Map<string, AssessmentPoint[]>();
	for (const row of rows) {
		const points = grouped.get(row.memberId) ?? [];
		points.push({
			assessedAt: row.assessedAt,
			bodyFatPercent: row.bodyFatPercent,
		});
		grouped.set(row.memberId, points);
	}
	return grouped;
}

export async function loadOrganizationLeaderboard(
	scope: MemberOrganizationScope
): Promise<OrganizationLeaderboardDto> {
	const members = await listCompetingMembers(scope.organizationId);
	if (members.length === 0) {
		return {
			metric: LEADERBOARD_METRIC,
			organization: scope.organization,
			self: buildLeaderboardSelf([], scope.memberId),
			top: [],
		};
	}

	const assessmentsByMember = await loadAssessmentsByMember(
		members.map((competitor) => competitor.id)
	);
	const ranked = rankLeaderboardCandidates(
		buildLeaderboardCandidates(members, assessmentsByMember)
	);

	return {
		metric: LEADERBOARD_METRIC,
		organization: scope.organization,
		self: buildLeaderboardSelf(ranked, scope.memberId),
		top: ranked.slice(0, TOP_COUNT).map(toEntryDto),
	};
}
