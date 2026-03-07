'use client'

import { useQuery } from '@tanstack/react-query'
import { dietPlanQueryOptions } from '@/lib/queries/diet-plans'
import type { DataSource } from '@/lib/queries/keys'

export function useDietPlan(id: string, source: DataSource = 'admin') {
  const query = useQuery(dietPlanQueryOptions(id, source))
  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  }
}
