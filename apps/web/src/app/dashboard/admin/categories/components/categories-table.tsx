'use client'

import type { PaginationConfig } from '@/lib/table-core'
import { BaseDataTable, TableControls, TablePagination, useTableSorting } from '@/lib/table-core'
import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import * as React from 'react'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { createCategoriesColumns, type CategoriesSortBy } from './categories-columns'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination'

export interface CategoriesTableProps {
  categories: FoodCategory[]
  pagination: PaginationConfig
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (q: string) => void
  searchValue: string
  sortBy?: CategoriesSortBy
  sortOrder?: 'asc' | 'desc'
  onSortingChange: (sortBy?: CategoriesSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading: boolean
  onRefetch: () => void
  onEdit: (category: FoodCategory) => void
  onDelete: (category: FoodCategory) => void
  readOnly?: boolean
}

export function CategoriesTable({
  categories,
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
}: Readonly<CategoriesTableProps>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    createdAt: false,
  })

  const { handleSort } = useTableSorting<CategoriesSortBy>({
    sortBy,
    sortOrder,
    onSortingChange,
  })

  const columns = React.useMemo(
    () =>
      createCategoriesColumns({
        sortBy,
        sortOrder,
        onSort: id => handleSort(id as CategoriesSortBy),
        onEdit,
        onDelete,
        readOnly,
      }),
    [sortBy, sortOrder, handleSort, onEdit, onDelete, readOnly]
  )

  const table = useReactTable({
    data: categories,
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
    <div className='w-full space-y-4'>
      <TableControls<FoodCategory>
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder='Search by name or description...'
        searchDebounceMs={300}
        table={table}
        getColumnLabel={getColumnLabel}
        columnVisibility={columnVisibility}
        hasActiveFilters={!!searchValue.trim()}
        onResetFilters={() => onSearchChange('')}
        showResetButton
      />
      <BaseDataTable<FoodCategory>
        data={categories}
        columns={columns}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage='No categories found.'
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
