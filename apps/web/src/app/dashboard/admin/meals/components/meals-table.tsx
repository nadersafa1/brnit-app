'use client'

import type { PaginationMeta } from '@/lib/api-helpers/pagination'
import { BaseDataTable, TableControls, TablePagination, useTableSorting } from '@/lib/table-core'
import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import type { Meal } from '@/lib/queries/meals'
import { createMealsColumns, type MealsSortBy } from './meals-columns'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination'
import { usePaginationTableConfig, type PaginationFallback } from '@/hooks/use-pagination-table-config'

const COLUMN_LABELS: Record<string, string> = {
  name: 'Name',
  description: 'Description',
  totalCalories: 'kcal',
  totalProtein: 'Protein (g)',
  totalCarbs: 'Carbs (g)',
  totalFat: 'Fat (g)',
  createdAt: 'Created',
  actions: 'Actions',
}

function getColumnLabel(id: string) {
  return COLUMN_LABELS[id] ?? id
}

export interface MealsTableProps {
  meals: Meal[]
  paginationMeta: PaginationMeta | null | undefined
  paginationFallback: PaginationFallback
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (q: string) => void
  searchValue: string
  sortBy?: MealsSortBy
  sortOrder?: 'asc' | 'desc'
  onSortingChange: (sortBy?: MealsSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading: boolean
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
  readOnly?: boolean
}

export function MealsTable({
  meals,
  paginationMeta,
  paginationFallback,
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
}: Readonly<MealsTableProps>) {
  const pagination = usePaginationTableConfig(paginationMeta, paginationFallback)

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
        readOnly,
      }),
    [sortBy, sortOrder, handleSort, onEdit, onDelete, readOnly]
  )

  const table = useReactTable({
    data: meals,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  })

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
