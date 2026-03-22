import { db } from '@burn-app/db'
import {
  bodyCompositionAssessment,
  member,
} from '@burn-app/db/schema'
import { and, eq, asc, inArray } from 'drizzle-orm'

const TOP_COUNT = 3
const MEMBER_ROLE = 'member'
/** Fallback when user name is missing (DB allows null). */
const DISPLAY_NAME_UNKNOWN = 'Unknown'

/** Parses DB numeric string to number; returns 0 for invalid or empty (used for ranking only). */
function parseNum(value: string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = Number.parseFloat(value)
  return Number.isNaN(n) ? 0 : n
}

export type LeaderboardEntry = {
  rank: number
  memberId: string
  name: string
  fatLossPoints: number
  startBodyFatPercent: number
  endBodyFatPercent: number
  startAssessedAt: Date
  endAssessedAt: Date
}

export type LeaderboardSelf = {
  rank: number | null
  eligibility: 'eligible' | 'not_enough_assessments'
  fatLossPoints: number | null
  startBodyFatPercent: number | null
  endBodyFatPercent: number | null
  startAssessedAt: Date | null
  endAssessedAt: Date | null
}

export type OrganizationLeaderboardResult = {
  organization: { id: string; name: string }
  metric: 'bodyFatPercentPointDrop'
  top: LeaderboardEntry[]
  self: LeaderboardSelf
}

type LeaderboardRow = {
  memberId: string
  name: string
  fatLossPoints: number
  startBodyFatPercent: number
  endBodyFatPercent: number
  startAssessedAt: Date
  endAssessedAt: Date
}

type RankedRow = LeaderboardRow & { rank: number }

/** Builds the self payload: either the requester's ranked entry or ineligible placeholder. */
function buildSelfPayload(
  ranked: RankedRow[],
  currentMemberId: string
): LeaderboardSelf {
  const selfEntry = ranked.find(e => e.memberId === currentMemberId)
  if (selfEntry) {
    return {
      rank: selfEntry.rank,
      eligibility: 'eligible',
      fatLossPoints: selfEntry.fatLossPoints,
      startBodyFatPercent: selfEntry.startBodyFatPercent,
      endBodyFatPercent: selfEntry.endBodyFatPercent,
      startAssessedAt: selfEntry.startAssessedAt,
      endAssessedAt: selfEntry.endAssessedAt,
    }
  }
  return {
    rank: null,
    eligibility: 'not_enough_assessments',
    fatLossPoints: null,
    startBodyFatPercent: null,
    endBodyFatPercent: null,
    startAssessedAt: null,
    endAssessedAt: null,
  }
}

export async function getOrganizationLeaderboard(
  organizationId: string,
  organizationName: string,
  currentMemberId: string
): Promise<OrganizationLeaderboardResult> {
  // Use member->user relation for display names while keeping the same org/member-role filters.
  const membersWithUser = await db.query.member.findMany({
    where: and(
      eq(member.organizationId, organizationId),
      eq(member.role, MEMBER_ROLE)
    ),
    columns: { id: true },
    with: {
      user: {
        columns: { name: true },
      },
    },
  })

  if (membersWithUser.length === 0) {
    return {
      organization: { id: organizationId, name: organizationName },
      metric: 'bodyFatPercentPointDrop',
      top: [],
      self: buildSelfPayload([] as RankedRow[], currentMemberId),
    }
  }

  // Single query: all assessments for these members, ordered by member then assessedAt for grouping.
  const memberIds = membersWithUser.map(m => m.id)
  const assessmentsRows = await db
    .select({
      memberId: bodyCompositionAssessment.memberId,
      assessedAt: bodyCompositionAssessment.assessedAt,
      bodyFatPercent: bodyCompositionAssessment.bodyFatPercent,
    })
    .from(bodyCompositionAssessment)
    .where(inArray(bodyCompositionAssessment.memberId, memberIds))
    .orderBy(
      asc(bodyCompositionAssessment.memberId),
      asc(bodyCompositionAssessment.assessedAt)
    )

  // Group assessments by memberId (rows are already sorted by memberId, then assessedAt).
  const byMember = new Map<string, { assessedAt: Date; bodyFatPercent: string }[]>()
  for (const row of assessmentsRows) {
    const list = byMember.get(row.memberId) ?? []
    list.push({ assessedAt: row.assessedAt, bodyFatPercent: row.bodyFatPercent })
    byMember.set(row.memberId, list)
  }

  // Compute one entry per member that has at least two assessments (baseline = first, latest = last).
  const entries: LeaderboardRow[] = []
  for (const m of membersWithUser) {
    const list = byMember.get(m.id)
    if (!list || list.length < 2) continue

    const baseline = list[0]
    const latest = list.at(-1)!
    const startPct = parseNum(baseline.bodyFatPercent)
    const endPct = parseNum(latest.bodyFatPercent)
    const fatLossPoints = startPct - endPct

    entries.push({
      memberId: m.id,
      name: m.user?.name ?? DISPLAY_NAME_UNKNOWN,
      fatLossPoints,
      startBodyFatPercent: startPct,
      endBodyFatPercent: endPct,
      startAssessedAt: baseline.assessedAt,
      endAssessedAt: latest.assessedAt,
    })
  }

  // Sort by fat loss descending; tiebreaker: latest assessment date desc, then memberId asc.
  entries.sort((a, b) => {
    if (b.fatLossPoints !== a.fatLossPoints) return b.fatLossPoints - a.fatLossPoints
    const tA = b.endAssessedAt.getTime()
    const tB = a.endAssessedAt.getTime()
    if (tA !== tB) return tA - tB
    return a.memberId.localeCompare(b.memberId)
  })

  const ranked: RankedRow[] = entries.map((e, i) => ({ ...e, rank: i + 1 }))
  const top: LeaderboardEntry[] = ranked.slice(0, TOP_COUNT).map(e => ({
    rank: e.rank,
    memberId: e.memberId,
    name: e.name,
    fatLossPoints: e.fatLossPoints,
    startBodyFatPercent: e.startBodyFatPercent,
    endBodyFatPercent: e.endBodyFatPercent,
    startAssessedAt: e.startAssessedAt,
    endAssessedAt: e.endAssessedAt,
  }))

  const self = buildSelfPayload(ranked, currentMemberId)

  return {
    organization: { id: organizationId, name: organizationName },
    metric: 'bodyFatPercentPointDrop',
    top,
    self,
  }
}
