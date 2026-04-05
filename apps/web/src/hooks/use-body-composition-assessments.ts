'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { directAdminKeys, nutritionistKeys } from '@/lib/queries/keys'

export type AssessmentSource = 'direct_admin' | 'nutritionist'

export interface BodyCompositionAssessment {
  id: string
  memberId: string
  assessedAt: string
  recordedById: string
  heightCm: string
  bodyFatPercent: string
  weightKg: string
  bmi: string
  muscleMassKg: string
  visceralFatAreaCm2: string
  bodyWaterL: string
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface BodyCompositionAssessmentsFilters {
  page?: number
  perPage?: number
  memberId?: string
  sortBy?: 'assessedAt' | 'createdAt'
  sortOrder?: 'asc' | 'desc'
}

export interface BodyCompositionAssessmentsResponse {
  data: BodyCompositionAssessment[]
  pagination: PaginationMeta
}

function assessmentsListBaseUrl(source: AssessmentSource): string {
  return source === 'nutritionist'
    ? API_ENDPOINTS.nutritionist.bodyCompositionAssessments
    : API_ENDPOINTS.directAdmin.bodyCompositionAssessments
}

export async function fetchBodyCompositionAssessments(
  filters: BodyCompositionAssessmentsFilters,
  source: AssessmentSource = 'direct_admin'
): Promise<BodyCompositionAssessmentsResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  const url = `${assessmentsListBaseUrl(source)}?${params.toString()}`
  const res = await fetchWithCredentials(url)
  return requireJsonSuccess<BodyCompositionAssessmentsResponse>(res, `Request failed: ${res.status}`)
}

export function useBodyCompositionAssessments(
  filters: BodyCompositionAssessmentsFilters,
  source: AssessmentSource = 'direct_admin'
) {
  const queryKey =
    source === 'nutritionist'
      ? nutritionistKeys.bodyCompositionAssessments(filters)
      : directAdminKeys.bodyCompositionAssessments(filters)
  return useQuery({
    queryKey,
    queryFn: () => fetchBodyCompositionAssessments(filters, source),
    enabled: !!filters.memberId || true,
  })
}

export type CreateAssessmentFormData = {
  memberId: string
  assessedAt: string
  bodyFatPercent: string | number
  weightKg: string | number
  muscleMassKg: string | number
  visceralFatAreaCm2: string | number
  bodyWaterL: string | number
  file?: File
}

export function useCreateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (formData: CreateAssessmentFormData) => {
      const fd = new FormData()
      fd.set('memberId', formData.memberId)
      fd.set('assessedAt', formData.assessedAt)
      fd.set('bodyFatPercent', String(formData.bodyFatPercent))
      fd.set('weightKg', String(formData.weightKg))
      fd.set('muscleMassKg', String(formData.muscleMassKg))
      fd.set('visceralFatAreaCm2', String(formData.visceralFatAreaCm2))
      fd.set('bodyWaterL', String(formData.bodyWaterL))
      if (formData.file) fd.set('file', formData.file)

      const res = await fetchWithCredentials(API_ENDPOINTS.directAdmin.bodyCompositionAssessments, {
        method: 'POST',
        body: fd,
      })
      return requireJsonSuccess(res, 'Failed to create assessment')
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({ memberId: variables.memberId }).slice(0, 2),
      })
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({}).slice(0, 2),
      })
      toast.success('Assessment created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export type UpdateAssessmentFormData = Partial<{
  assessedAt: string
  bodyFatPercent: string | number
  weightKg: string | number
  muscleMassKg: string | number
  visceralFatAreaCm2: string | number
  bodyWaterL: string | number
  file: File
  clearImage: boolean
}>

export function useUpdateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      memberId,
      ...data
    }: UpdateAssessmentFormData & { id: string; memberId: string }) => {
      const fd = new FormData()
      if (data.assessedAt !== undefined) fd.set('assessedAt', data.assessedAt)
      if (data.bodyFatPercent !== undefined) fd.set('bodyFatPercent', String(data.bodyFatPercent))
      if (data.weightKg !== undefined) fd.set('weightKg', String(data.weightKg))
      if (data.muscleMassKg !== undefined) fd.set('muscleMassKg', String(data.muscleMassKg))
      if (data.visceralFatAreaCm2 !== undefined)
        fd.set('visceralFatAreaCm2', String(data.visceralFatAreaCm2))
      if (data.bodyWaterL !== undefined) fd.set('bodyWaterL', String(data.bodyWaterL))
      if (data.clearImage) fd.set('clearImage', '1')
      if (data.file) fd.set('file', data.file)

      const res = await fetchWithCredentials(
        API_ENDPOINTS.directAdmin.bodyCompositionAssessment(id),
        { method: 'PATCH', body: fd }
      )
      return requireJsonSuccess(res, 'Failed to update assessment')
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({ memberId: variables.memberId }).slice(0, 2),
      })
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({}).slice(0, 2),
      })
      toast.success('Assessment updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, memberId }: { id: string; memberId: string }) => {
      const res = await fetchWithCredentials(
        API_ENDPOINTS.directAdmin.bodyCompositionAssessment(id),
        { method: 'DELETE' }
      )
      return requireJsonSuccess(res, 'Failed to delete assessment')
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({ memberId: variables.memberId }).slice(0, 2),
      })
      qc.invalidateQueries({
        queryKey: directAdminKeys.bodyCompositionAssessments({}).slice(0, 2),
      })
      toast.success('Assessment deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
