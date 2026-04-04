'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import { roundNutritionMacro } from '@/lib/helpers/nutrition-numbers'
import { tableCellTextPreview } from '@/lib/helpers/text-table-cells'
import type { Meal } from '@/lib/queries/meals'
import { Edit, MoreHorizontal, Trash2 } from 'lucide-react'

export type MealsSortBy = 'name' | 'createdAt'

export interface CreateMealsColumnsOptions {
  sortBy?: MealsSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
  readOnly?: boolean
}

export function createMealsColumns({
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  readOnly = false,
}: Readonly<CreateMealsColumnsOptions>): ColumnDef<Meal>[] {
  const columns: ColumnDef<Meal>[] = [
    {
      id: 'name',
      accessorKey: 'name',
      header: () => createSortableHeader('Name', 'name', sortBy, sortOrder, onSort),
      cell: ({ row }) => (
        <button type='button' className='font-medium text-left hover:underline' onClick={() => onEdit(row.original)}>
          {row.original.name}
        </button>
      ),
    },
    createTextColumn<Meal>('description', 'Description', row => tableCellTextPreview(row.description), {}),
    createTextColumn<Meal>('totalCalories', 'kcal', row => String(row.totalCalories), {}),
    createTextColumn<Meal>('totalProtein', 'Protein (g)', row => String(roundNutritionMacro(row.totalProtein)), {}),
    createTextColumn<Meal>('totalCarbs', 'Carbs (g)', row => String(roundNutritionMacro(row.totalCarbs)), {}),
    createTextColumn<Meal>('totalFat', 'Fat (g)', row => String(roundNutritionMacro(row.totalFat)), {}),
    createTextColumn<Meal>(
      'createdAt',
      'Created',
      row => (row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '–'),
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
              <Button variant='ghost' size='icon' className='h-8 w-8'>
                <MoreHorizontal className='h-4 w-4' />
                <span className='sr-only'>Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Edit className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item)} className='text-destructive focus:text-destructive'>
                <Trash2 className='mr-2 h-4 w-4' />
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
