'use client'

import { useQuery } from '@tanstack/react-query'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { nutritionistKeys } from '@/lib/queries/keys'

export interface DietPlanAssignment {
  id: string
  memberId: string | null
  userId: string | null
  dietPlanId: string
  startDate: string
  endDate: string
  createdAt: string
  mealTimeOverrides?: Array<{
    dietPlanMealId: string
    scheduledTime: string
  }>
}

export interface MemberAssignmentsResponse {
  data: DietPlanAssignment[]
  pagination: { page: number; perPage: number; totalItems: number; totalPages: number }
}

async function fetchMemberAssignments(url: string): Promise<MemberAssignmentsResponse> {
  const res = await fetchWithCredentials(url)
  return requireJsonSuccess<MemberAssignmentsResponse>(res, `Request failed: ${res.status}`)
}

export function useMemberAssignments(memberId: string | null, organizationId: string | null) {
  const params = new URLSearchParams()
  if (memberId) params.set('memberId', memberId)
  params.set('perPage', '100')

  const url = `${API_ENDPOINTS.nutritionist.dietPlanAssignments}?${params.toString()}`
  const enabled = !!memberId && !!organizationId

  const query = useQuery({
    queryKey: [...nutritionistKeys.dietPlanAssignments({ memberId: memberId ?? undefined }), organizationId],
    queryFn: () => fetchMemberAssignments(url),
    enabled,
  })

  const assignments: DietPlanAssignment[] = query.data?.data ?? []
  return {
    assignments,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
