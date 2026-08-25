'use client'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Meal } from '@/lib/queries/meals'
import { Copy, Edit, MoreHorizontal, Trash2 } from 'lucide-react'

export interface MealsRowActionsProps {
  meal: Meal
  onEdit: (meal: Meal) => void
  onClone: (meal: Meal) => void
  onDelete: (meal: Meal) => void
}

/** Row-level actions for the meals data table (keeps column defs focused on shape, not menu markup). */
export function MealsRowActions({ meal, onEdit, onClone, onDelete }: Readonly<MealsRowActionsProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='h-8 w-8'>
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={() => onEdit(meal)}>
          <Edit className='mr-2 h-4 w-4' />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onClone(meal)}>
          <Copy className='mr-2 h-4 w-4' />
          Clone
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDelete(meal)} className='text-destructive focus:text-destructive'>
          <Trash2 className='mr-2 h-4 w-4' />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
