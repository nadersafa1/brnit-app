'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import type { FoodItem } from '@/lib/queries/food-items'
import { formatFoodCategoriesDisplay } from '@/lib/helpers/food-item-categories'
import { formatFoodUnitLabel } from '@/lib/helpers/food-unit-display'
import { Edit, ImageIcon, MoreHorizontal, Trash2 } from 'lucide-react'

export type FoodItemsSortBy = 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'createdAt'

export interface CreateFoodItemsColumnsOptions {
  sortBy?: FoodItemsSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onEdit: (item: FoodItem) => void
  onDelete: (item: FoodItem) => void
  readOnly?: boolean
}

export function createFoodItemsColumns({
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  readOnly = false,
}: CreateFoodItemsColumnsOptions): ColumnDef<FoodItem>[] {
  const columns: ColumnDef<FoodItem>[] = [
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
    {
      id: 'image',
      accessorKey: 'imageUrl',
      header: 'Image',
      cell: ({ row }) => {
        const item = row.original
        if (!item.imageUrl) {
          return (
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md">
                <ImageIcon className="size-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
          )
        }
        return (
          <a
            href={item.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-md overflow-hidden ring-1 ring-border"
          >
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={item.imageUrl} alt="" className="rounded-md object-cover" />
              <AvatarFallback className="rounded-md">View</AvatarFallback>
            </Avatar>
          </a>
        )
      },
    },
    createTextColumn<FoodItem>('unit', 'Unit', (row) => formatFoodUnitLabel(row.unit ?? '100g'), {}),
    createTextColumn<FoodItem>(
      'categories',
      'Categories',
      (row) => formatFoodCategoriesDisplay(row.categories),
      {}
    ),
    createTextColumn<FoodItem>('calories', 'Calories', (row) => String(row.calories), {
      sortable: true,
      sortBy,
      sortOrder,
      onSort,
    }),
    createTextColumn<FoodItem>('protein', 'Protein', (row) => String(row.protein), {
      sortable: true,
      sortBy,
      sortOrder,
      onSort,
    }),
    createTextColumn<FoodItem>('carbs', 'Carbs', (row) => String(row.carbs), {
      sortable: true,
      sortBy,
      sortOrder,
      onSort,
    }),
    createTextColumn<FoodItem>('fat', 'Fat', (row) => String(row.fat), {
      sortable: true,
      sortBy,
      sortOrder,
      onSort,
    }),
    createTextColumn<FoodItem>(
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
