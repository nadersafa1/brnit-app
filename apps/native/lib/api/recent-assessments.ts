import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type RecentAssessmentItem = {
  id: string;
  assessedAt: string;
  bodyFatPercent: number | null;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  muscleMassKg: number | null;
  visceralFatAreaCm2: number | null;
  bodyWaterL: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  organization: { id: string; name: string };
};

export type RecentAssessmentsResponse = {
  organization: { id: string; name: string } | null;
  assessments: RecentAssessmentItem[];
};

function buildRecentAssessmentsUrl(limit?: number, orgId?: string): string {
  const base = API_ENDPOINTS.member.recentAssessments
  const params = new URLSearchParams()
  if (limit != null) params.set('limit', String(limit))
  if (orgId) params.set('orgId', orgId)
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

/** Fetches recent body-composition assessments for the current user (optionally scoped by org). */
export async function getRecentAssessments(
  options?: {
    limit?: number;
    orgId?: string;
  } & Pick<ApiFetchOptions, "signal">
): Promise<RecentAssessmentsResponse> {
  const { limit, orgId, signal } = options ?? {};
  return apiFetch<RecentAssessmentsResponse>(buildRecentAssessmentsUrl(limit, orgId), {
    method: 'GET',
    signal,
  })
}
