'use client'

import { useCallback, useMemo, useState } from 'react'
import type { PaginationFallback } from './use-pagination-table-config'

/**
 * Manages paginated list filter state with stable callbacks for page, page-size,
 * and search changes. Use `updateFilters` for domain-specific changes (sorting,
 * category filter, etc.) — it always resets to page 1.
 */
export function useListFilters<T extends { page: number; perPage: number; q: string }>(
  initialFilters: T
) {
  const [filters, setFilters] = useState(initialFilters)

  const onPageChange = useCallback(
    (page: number) => setFilters(f => ({ ...f, page })),
    []
  )

  const onPageSizeChange = useCallback(
    (perPage: number) => setFilters(f => ({ ...f, perPage, page: 1 })),
    []
  )

  const onSearchChange = useCallback(
    (q: string) => setFilters(f => ({ ...f, q, page: 1 })),
    []
  )

  const updateFilters = useCallback(
    (partial: Partial<T>) => setFilters(f => ({ ...f, ...partial, page: 1 })),
    []
  )

  const paginationFallback: PaginationFallback = useMemo(
    () => ({ page: filters.page, perPage: filters.perPage }),
    [filters.page, filters.perPage]
  )

  return {
    filters,
    paginationFallback,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    updateFilters,
  }
}
