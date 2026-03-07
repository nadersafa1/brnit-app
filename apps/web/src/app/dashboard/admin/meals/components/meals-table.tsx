'use client'

import type { PaginationConfig } from '@/lib/table-core'
import { BaseDataTable, TableControls, TablePagination, useTableSorting } from '@/lib/table-core'
import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import type { Meal } from '@/lib/queries/meals'
import { createMealsColumns, type MealsSortBy } from './meals-columns'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination'

export interface MealsTableProps {
  meals: Meal[]
  pagination: PaginationConfig
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (q: string) => void
  searchValue: string
  sortBy?: MealsSortBy
  sortOrder?: 'asc' | 'desc'
  onSortingChange: (sortBy?: MealsSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading: boolean
  onRefetch: () => void
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

export function MealsTable({
  meals,
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
}: MealsTableProps) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    createdAt: false,
  })

  const { handleSort } = useTableSorting<MealsSortBy>({
    sortBy,
    sortOrder,
    onSortingChange,
  })

  const columns = React.useMemo(
    () =>
      createMealsColumns({
        sortBy,
        sortOrder,
        onSort: (id) => handleSort(id as MealsSortBy),
        onEdit,
        onDelete,
      }),
    [sortBy, sortOrder, handleSort, onEdit, onDelete]
  )

  const table = useReactTable({
    data: meals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  })

  const getColumnLabel = React.useCallback((id: string) => {
    const labels: Record<string, string> = {
      name: 'Name',
      description: 'Description',
      createdAt: 'Created',
      actions: 'Actions',
    }
    return labels[id] ?? id
  }, [])

  return (
    <div className="w-full space-y-4">
      <TableControls<Meal>
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
      <BaseDataTable<Meal>
        data={meals}
        columns={columns}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage="No meals found."
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
