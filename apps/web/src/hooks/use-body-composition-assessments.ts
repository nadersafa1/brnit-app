'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { directAdminKeys } from '@/lib/queries/keys'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'

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

async function fetchWithAuth(
  url: string,
  options?: { method?: string; body?: FormData | string }
): Promise<Response> {
  const headers: HeadersInit = {}
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    credentials: 'include',
    method: options?.method ?? 'GET',
    headers: Object.keys(headers).length ? headers : undefined,
    body: options?.body,
  })
  return res
}

export function fetchBodyCompositionAssessments(
  filters: BodyCompositionAssessmentsFilters
): Promise<BodyCompositionAssessmentsResponse> {
  const params = new URLSearchParams()
  if (filters.page != null) params.set('page', String(filters.page))
  if (filters.perPage != null) params.set('perPage', String(filters.perPage))
  if (filters.memberId) params.set('memberId', filters.memberId)
  if (filters.sortBy) params.set('sortBy', filters.sortBy)
  if (filters.sortOrder) params.set('sortOrder', filters.sortOrder)
  const url = `${API_ENDPOINTS.directAdmin.bodyCompositionAssessments}?${params.toString()}`
  return fetchWithAuth(url).then(async res => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error ?? `Request failed: ${res.status}`)
    }
    return res.json()
  })
}

export function useBodyCompositionAssessments(filters: BodyCompositionAssessmentsFilters) {
  const queryKey = directAdminKeys.bodyCompositionAssessments(filters)
  return useQuery({
    queryKey,
    queryFn: () => fetchBodyCompositionAssessments(filters),
    enabled: !!filters.memberId || true,
  })
}

export type CreateAssessmentFormData = {
  memberId: string
  assessedAt: string
  heightCm: string | number
  bodyFatPercent: string | number
  weightKg: string | number
  bmi: string | number
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
      fd.set('heightCm', String(formData.heightCm))
      fd.set('bodyFatPercent', String(formData.bodyFatPercent))
      fd.set('weightKg', String(formData.weightKg))
      fd.set('bmi', String(formData.bmi))
      fd.set('muscleMassKg', String(formData.muscleMassKg))
      fd.set('visceralFatAreaCm2', String(formData.visceralFatAreaCm2))
      fd.set('bodyWaterL', String(formData.bodyWaterL))
      if (formData.file) fd.set('file', formData.file)

      const res = await fetchWithAuth(API_ENDPOINTS.directAdmin.bodyCompositionAssessments, {
        method: 'POST',
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create assessment')
      }
      return res.json()
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
  heightCm: string | number
  bodyFatPercent: string | number
  weightKg: string | number
  bmi: string | number
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
      if (data.heightCm !== undefined) fd.set('heightCm', String(data.heightCm))
      if (data.bodyFatPercent !== undefined) fd.set('bodyFatPercent', String(data.bodyFatPercent))
      if (data.weightKg !== undefined) fd.set('weightKg', String(data.weightKg))
      if (data.bmi !== undefined) fd.set('bmi', String(data.bmi))
      if (data.muscleMassKg !== undefined) fd.set('muscleMassKg', String(data.muscleMassKg))
      if (data.visceralFatAreaCm2 !== undefined)
        fd.set('visceralFatAreaCm2', String(data.visceralFatAreaCm2))
      if (data.bodyWaterL !== undefined) fd.set('bodyWaterL', String(data.bodyWaterL))
      if (data.clearImage) fd.set('clearImage', '1')
      if (data.file) fd.set('file', data.file)

      const res = await fetchWithAuth(
        API_ENDPOINTS.directAdmin.bodyCompositionAssessment(id),
        { method: 'PATCH', body: fd }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to update assessment')
      }
      return res.json()
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
      const res = await fetchWithAuth(
        API_ENDPOINTS.directAdmin.bodyCompositionAssessment(id),
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete assessment')
      }
      return res.json()
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
