import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type LeaderboardEntry = {
  rank: number;
  memberId: string;
  name: string;
  fatLossPoints: number;
  startBodyFatPercent: number;
  endBodyFatPercent: number;
  startAssessedAt: string;
  endAssessedAt: string;
};

export type LeaderboardSelf = {
  rank: number | null;
  eligibility: "eligible" | "not_enough_assessments";
  fatLossPoints: number | null;
  startBodyFatPercent: number | null;
  endBodyFatPercent: number | null;
  startAssessedAt: string | null;
  endAssessedAt: string | null;
};

export type OrganizationLeaderboardResponse = {
  organization: { id: string; name: string };
  metric: "bodyFatPercentPointDrop";
  top: LeaderboardEntry[];
  self: LeaderboardSelf;
};

function buildLeaderboardUrl(orgId?: string): string {
  const base = API_ENDPOINTS.member.organizationLeaderboard
  if (!orgId) return base
  return `${base}?orgId=${encodeURIComponent(orgId)}`
}

/** Fetches organization leaderboard (body-fat % point drop). Pass orgId for member app. */
export async function getOrganizationLeaderboard(
  options?: {
    orgId?: string;
  } & Pick<ApiFetchOptions, "signal">
): Promise<OrganizationLeaderboardResponse> {
  const { orgId, signal } = options ?? {};
  return apiFetch<OrganizationLeaderboardResponse>(buildLeaderboardUrl(orgId), {
    method: 'GET',
    signal,
  })
}
