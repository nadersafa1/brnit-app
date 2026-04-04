'use client'

import type { PaginationConfig } from '@/lib/table-core'
import { BaseDataTable, TableControls, TableFilter, TablePagination, useTableSorting } from '@/lib/table-core'
import type { VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import * as React from 'react'
import type { FoodItem } from '@/lib/queries/food-items'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { createFoodItemsColumns, type FoodItemsSortBy } from './food-items-columns'
import { PAGE_SIZE_OPTIONS } from '@/lib/constants/pagination'

export interface FoodItemsTableProps {
  items: FoodItem[]
  categories: FoodCategory[]
  pagination: PaginationConfig
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSearchChange: (q: string) => void
  searchValue: string
  categoryId?: string
  onCategoryChange: (categoryId: string | undefined) => void
  sortBy?: FoodItemsSortBy
  sortOrder?: 'asc' | 'desc'
  onSortingChange: (sortBy?: FoodItemsSortBy, sortOrder?: 'asc' | 'desc') => void
  isLoading: boolean
  onEdit: (item: FoodItem) => void
  onDelete: (item: FoodItem) => void
  readOnly?: boolean
}

/** Search, category filter, sort, and pagination; data loading and refetch live in parent pages. */
export function FoodItemsTable({
  items,
  categories,
  pagination,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  searchValue,
  categoryId,
  onCategoryChange,
  sortBy,
  sortOrder,
  onSortingChange,
  isLoading,
  onEdit,
  onDelete,
  readOnly = false,
}: Readonly<FoodItemsTableProps>) {
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({
    createdAt: false,
    calories: false,
    protein: false,
    carbs: false,
    fat: false,
  })

  const { handleSort } = useTableSorting<FoodItemsSortBy>({
    sortBy,
    sortOrder,
    onSortingChange,
  })

  const columns = React.useMemo(
    () =>
      createFoodItemsColumns({
        sortBy,
        sortOrder,
        onSort: id => handleSort(id as FoodItemsSortBy),
        onEdit,
        onDelete,
        readOnly,
      }),
    [sortBy, sortOrder, handleSort, onEdit, onDelete, readOnly]
  )

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  })

  const getColumnLabel = React.useCallback((id: string) => {
    const labels: Record<string, string> = {
      name: 'Name',
      unit: 'Unit',
      categories: 'Categories',
      calories: 'Calories',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',
      createdAt: 'Created',
      actions: 'Actions',
    }
    return labels[id] ?? id
  }, [])

  return (
    <div className='w-full space-y-4'>
      <TableControls<FoodItem>
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder='Search by name...'
        searchDebounceMs={300}
        table={table}
        getColumnLabel={getColumnLabel}
        columnVisibility={columnVisibility}
        hasActiveFilters={!!(searchValue.trim() || categoryId)}
        filters={
          <TableFilter label='Category' htmlFor='food-item-category' className='w-full md:w-[200px]'>
            <Select value={categoryId ?? 'all'} onValueChange={v => onCategoryChange(v === 'all' ? undefined : v)}>
              <SelectTrigger id='food-item-category' className='w-full'>
                <SelectValue placeholder='All categories' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TableFilter>
        }
        onResetFilters={() => {
          onSearchChange('')
          onCategoryChange(undefined)
        }}
        showResetButton
      />
      <BaseDataTable<FoodItem>
        data={items}
        columns={columns}
        pagination={pagination}
        isLoading={isLoading}
        emptyMessage='No food items found.'
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
