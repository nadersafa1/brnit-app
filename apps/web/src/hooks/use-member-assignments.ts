'use client'

import { useQuery } from '@tanstack/react-query'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { nutritionistKeys } from '@/lib/queries/keys'

export interface DietPlanAssignment {
  id: string
  memberId: string | null
  userId: string | null
  dietPlanId: string
  startDate: string
  endDate: string
  createdAt: string
}

export interface MemberAssignmentsResponse {
  data: DietPlanAssignment[]
  pagination: { page: number; perPage: number; totalItems: number; totalPages: number }
}

async function fetchWithAuth(url: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `Request failed: ${res.status}`)
  }
  return res.json()
}

export function useMemberAssignments(memberId: string | null, organizationId: string | null) {
  const params = new URLSearchParams()
  if (memberId) params.set('memberId', memberId)
  params.set('perPage', '100')

  const url = `${API_ENDPOINTS.nutritionist.dietPlanAssignments}?${params.toString()}`
  const enabled = !!memberId && !!organizationId

  const query = useQuery({
    queryKey: [...nutritionistKeys.dietPlanAssignments({ memberId: memberId ?? undefined }), organizationId],
    queryFn: () => fetchWithAuth(url),
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
