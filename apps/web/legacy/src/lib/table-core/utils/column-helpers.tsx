/**
 * Column helpers – sortable header, text column.
 */

import type { ColumnDef } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BaseTableEntity } from '../types'
import type { SortOrder } from '../types'

export function createSortableHeader(
  label: string,
  columnId: string,
  sortBy?: string,
  sortOrder?: SortOrder,
  onSort?: (columnId: string) => void
) {
  const isSorted = sortBy === columnId
  const Icon = isSorted ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <Button
      variant="ghost"
      className="h-8 px-2 lg:px-3"
      onClick={() => onSort?.(columnId)}
    >
      {label}
      <Icon className={`ml-2 h-4 w-4 ${isSorted ? '' : 'opacity-50'}`} />
    </Button>
  )
}

export function createTextColumn<TData extends BaseTableEntity>(
  id: string,
  header: string,
  accessorFn: (row: TData) => string | null | undefined,
  options?: {
    sortable?: boolean
    sortBy?: string
    sortOrder?: SortOrder
    onSort?: (columnId: string) => void
    className?: string
    fallback?: string
  }
): ColumnDef<TData> {
  return {
    id,
    accessorFn,
    header: options?.sortable
      ? () =>
          createSortableHeader(
            header,
            id,
            options?.sortBy,
            options?.sortOrder,
            options?.onSort
          )
      : header,
    cell: ({ row }) => {
      const value = accessorFn(row.original)
      return (
        <div className={options?.className}>{value ?? options?.fallback ?? '–'}</div>
      )
    },
  }
}
