'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type VisibilityState,
} from '@tanstack/react-table'
import type { BaseTableEntity, PaginationConfig } from '../types'
import { TableSkeleton } from './TableSkeleton'

export interface BaseDataTableProps<TData extends BaseTableEntity> {
  data: TData[]
  columns: ColumnDef<TData>[]
  pagination: PaginationConfig
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
  columnVisibility?: VisibilityState
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>
}

export function BaseDataTable<TData extends BaseTableEntity>({
  data,
  columns,
  pagination,
  isLoading = false,
  error,
  emptyMessage = 'No results found.',
  columnVisibility,
  onColumnVisibilityChange,
}: Readonly<BaseDataTableProps<TData>>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    state: { columnVisibility },
    onColumnVisibilityChange,
  })

  if (isLoading) {
    return <TableSkeleton rows={pagination.perPage} columns={columns.length} />
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 bg-destructive/10 p-8'>
        <p className='text-sm font-medium text-destructive'>Error loading data</p>
        <p className='text-sm text-muted-foreground'>{error}</p>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className='rounded-md border p-8'>
        <p className='text-sm text-muted-foreground'>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <section className='rounded-md border overflow-x-auto' aria-label='Data table'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
