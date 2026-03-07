'use client'

import type { PaginationConfig } from '@/lib/table-core'
import { BaseDataTable, TableControls, TablePagination, useTableSorting } from '@/lib/table-core'
import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import type { DietPlan } from '@/lib/queries/diet-plans'
import { createDietPlansColumns, type DietPlansSortBy } from './diet-plans-columns'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination'

export interface DietPlansTableProps {
  plans: DietPlan[]
  pagination: PaginationConfig
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (q: string) => void
  searchValue: string
  sortBy?: DietPlansSortBy
  sortOrder?: 'asc' | 'desc'
  onSortingChange: (sortBy?: DietPlansSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading: boolean
  onRefetch: () => void
  onEdit: (plan: DietPlan) => void
  onDelete: (plan: DietPlan) => void
  readOnly?: boolean
}

export function DietPlansTable({
  plans,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  searchValue,
  sortBy,
  sortOrder,
  onSortingChange,
  isLoading,
  onEdit,
  onDelete,
  readOnly = false,
}: DietPlansTableProps) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    createdAt: false,
  })

  const { handleSort } = useTableSorting<DietPlansSortBy>({
    sortBy,
    sortOrder,
    onSortingChange,
  })

  const columns = React.useMemo(
    () =>
      createDietPlansColumns({
        sortBy,
        sortOrder,
        onSort: (id) => handleSort(id as DietPlansSortBy),
        onEdit,
        onDelete,
        readOnly,
      }),
    [sortBy, sortOrder, handleSort, onEdit, onDelete, readOnly]
  )

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  })

  const getColumnLabel = React.useCallback((id: string) => {
    const labels: Record<string, string> = {
      name: 'Name',
      description: 'Description',
      slotCount: 'Slots',
      createdAt: 'Created',
      actions: 'Actions',
    }
    return labels[id] ?? id
  }, [])

  return (
    <div className="w-full space-y-4">
      <TableControls<DietPlan>
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search by name..."
        searchDebounceMs={300}
        table={table}
        getColumnLabel={getColumnLabel}
        columnVisibility={columnVisibility}
        hasActiveFilters={!!searchValue.trim()}
        onResetFilters={() => onSearchChange('')}
        showResetButton
      />
      <BaseDataTable<DietPlan>
        data={plans}
        columns={columns}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage="No diet plans found."
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={setColumnVisibility}
      />
      <TablePagination
        pagination={pagination}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
      />
    </div>
  )
}
