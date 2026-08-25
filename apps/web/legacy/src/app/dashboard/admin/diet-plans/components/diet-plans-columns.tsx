'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { tableCellTextPreview } from '@/lib/helpers/text-table-cells'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import type { DietPlan } from '@/lib/queries/diet-plans'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'

export type DietPlansSortBy = 'name' | 'createdAt'

export interface CreateDietPlansColumnsOptions {
  sortBy?: DietPlansSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onEdit: (plan: DietPlan) => void
  onDelete: (plan: DietPlan) => void
  readOnly?: boolean
}

export function createDietPlansColumns({
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  readOnly = false,
}: CreateDietPlansColumnsOptions): ColumnDef<DietPlan>[] {
  const columns: ColumnDef<DietPlan>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => createSortableHeader('Name', 'name', sortBy, sortOrder, onSort),
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium text-left hover:underline"
          onClick={() => onEdit(row.original)}
        >
          {row.original.name}
        </button>
      ),
    },
    createTextColumn<DietPlan>('description', 'Description', row => tableCellTextPreview(row.description), {}),
    createTextColumn<DietPlan>(
      'slotCount',
      'Slots',
      (row) => {
        const n = row.slotCount ?? 0
        return `${n} slot${n === 1 ? '' : 's'}`
      },
      {}
    ),
    createTextColumn<DietPlan>(
      'createdAt',
      'Created',
      (row) => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '–'),
      { sortable: true, sortBy, sortOrder, onSort }
    ),
  ]
  if (!readOnly) {
    columns.push({
      id: 'actions',
      header: '',
      enableHiding: false,
      cell: ({ row }) => {
        const item = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    })
  }
  return columns
}
