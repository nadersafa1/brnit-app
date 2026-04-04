'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { createSortableHeader, createTextColumn } from '@/lib/table-core'
import type { SortOrder } from '@/lib/table-core'
import { roundNutritionMacro } from '@/lib/helpers/nutrition-numbers'
import { tableCellTextPreview } from '@/lib/helpers/text-table-cells'
import type { Meal } from '@/lib/queries/meals'
import { MealsRowActions } from './meals-row-actions'

export type MealsSortBy = 'name' | 'createdAt'

/** Options for the shared meals grid: sort UI plus row actions wired by the list page. */
export interface CreateMealsColumnsOptions {
  sortBy?: MealsSortBy
  sortOrder?: SortOrder
  onSort?: (columnId: string) => void
  onEdit: (meal: Meal) => void
  onDelete: (meal: Meal) => void
  onClone: (meal: Meal) => void
  readOnly?: boolean
}

export function createMealsColumns({
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
  onClone,
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
      cell: ({ row }) => (
        <MealsRowActions meal={row.original} onEdit={onEdit} onClone={onClone} onDelete={onDelete} />
      ),
    })
  }
  return columns
}
