'use client'

import { useCallback, useMemo } from 'react'
import type { BaseTableEntity } from '../types'
import type { SortOrder } from '../types'

export interface UseTableSortingOptions<TSortBy extends string = string> {
  sortBy?: TSortBy
  sortOrder?: SortOrder
  onSortingChange?: (sortBy?: TSortBy, sortOrder?: SortOrder) => void
}

export interface UseTableSortingReturn<TSortBy extends string = string> {
  sortBy?: TSortBy
  sortOrder?: SortOrder
  handleSort: (columnId: TSortBy) => void
}

export function useTableSorting<TSortBy extends string = string>({
  sortBy,
  sortOrder,
  onSortingChange,
}: UseTableSortingOptions<TSortBy>): UseTableSortingReturn<TSortBy> {
  const handleSort = useCallback(
    (columnId: TSortBy) => {
      if (!onSortingChange) return
      if (sortBy === columnId) {
        const next: SortOrder | undefined =
          sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? undefined : 'asc'
        onSortingChange(next ? columnId : undefined, next)
      } else {
        onSortingChange(columnId, 'asc')
      }
    },
    [sortBy, sortOrder, onSortingChange]
  )

  return useMemo(
    () => ({ sortBy, sortOrder, handleSort }),
    [sortBy, sortOrder, handleSort]
  )
}
