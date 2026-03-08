'use client'

import * as React from 'react'
import { BaseCombobox } from '@/components/ui/combobox/base-combobox'
import { fetchDietPlans } from '@/lib/queries/diet-plans'
import type { DietPlan } from '@/lib/queries/diet-plans'

interface DietPlanComboboxProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  disabled?: boolean
  placeholder?: string
  className?: string
  allowClear?: boolean
}

export function DietPlanCombobox({
  value,
  onValueChange,
  disabled = false,
  placeholder = 'Select diet plan...',
  className,
  allowClear = true,
}: DietPlanComboboxProps) {
  const fetchItems = React.useCallback(
    async (
      query: string,
      page: number,
      limit: number,
      signal?: AbortSignal
    ): Promise<{ items: DietPlan[]; hasMore: boolean }> => {
      const response = await fetchDietPlans(
        { page, perPage: limit, q: query || undefined },
        'nutritionist'
      )
      const items = response.data ?? []
      const pagination = response.pagination
      const hasMore = pagination
        ? (pagination.page ?? 1) < (pagination.totalPages ?? 1)
        : false
      return { items, hasMore }
    },
    []
  )

  const fetchItem = React.useCallback(
    async (id: string): Promise<DietPlan> => {
      const { fetchDietPlan } = await import('@/lib/queries/diet-plans')
      const res = await fetchDietPlan(id, 'nutritionist')
      return res.data
    },
    []
  )

  const handleValueChange = React.useCallback(
    (v: string | null | string[]) => {
      if (typeof v === 'string' || v === null) onValueChange?.(v)
    },
    [onValueChange]
  )

  const formatLabel = React.useCallback((plan: DietPlan) => plan.name, [])

  return (
    <BaseCombobox<DietPlan>
      value={value ?? undefined}
      onValueChange={handleValueChange}
      fetchItems={fetchItems}
      fetchItem={fetchItem}
      disabled={disabled}
      placeholder={placeholder}
      searchPlaceholder="Search diet plans..."
      emptyMessage={(q) =>
        q ? 'No diet plans found.' : 'Start typing to search diet plans...'
      }
      className={className}
      formatLabel={formatLabel}
      allowClear={allowClear}
      aria-label="Select diet plan"
    />
  )
}
