'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'

export type CategoriesSortBy = 'name' | 'createdAt'

export interface CreateCategoriesColumnsOptions {
  sortBy?: CategoriesSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onEdit: (category: FoodCategory) => void
  onDelete: (category: FoodCategory) => void
  readOnly?: boolean
}

export function createCategoriesColumns({
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  readOnly = false,
}: CreateCategoriesColumnsOptions): ColumnDef<FoodCategory>[] {
  const columns: ColumnDef<FoodCategory>[] = [
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
    createTextColumn<FoodCategory>(
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
        const c = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(c)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(c)}
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
