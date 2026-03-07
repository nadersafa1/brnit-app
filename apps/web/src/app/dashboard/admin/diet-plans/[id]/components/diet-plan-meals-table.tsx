'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { DietPlanMeal } from '@/lib/queries/diet-plans'
import { formatDayNumberDisplay } from '@/components/diet-plan/day-number-select'

function formatFoodItemsSummary(mealItems?: Array<{ foodName: string; quantity: number }>): string {
  if (!mealItems || mealItems.length === 0) return '–'
  return mealItems.map((mi) => `${mi.foodName} ${mi.quantity}g`).join(', ')
}

interface DietPlanMealsTableProps {
  meals: DietPlanMeal[]
  onEdit: (meal: DietPlanMeal) => void
  onRemove: (dietPlanMealId: string) => Promise<void>
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  isRemoving?: boolean
}

export function DietPlanMealsTable({
  meals,
  onEdit,
  onRemove,
  selectedIds,
  onSelectionChange,
  isRemoving = false,
}: DietPlanMealsTableProps) {
  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === meals.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(meals.map((m) => m.id))
    }
  }

  if (meals.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <p className="text-sm text-muted-foreground">
          No meal slots. Use &quot;Add meal&quot; to add slots. Use &quot;All days&quot; for meals that repeat every day.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedIds.length === meals.length && meals.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>Day</TableHead>
            <TableHead>Meal type</TableHead>
            <TableHead>Meal name</TableHead>
            <TableHead className="max-w-[300px]">Food items</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {meals.map((m) => (
            <TableRow key={m.id}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.includes(m.id)}
                  onCheckedChange={() => toggleSelect(m.id)}
                />
              </TableCell>
              <TableCell className="font-medium">
                {formatDayNumberDisplay(m.dayNumber)}
              </TableCell>
              <TableCell className="capitalize">{m.mealType}</TableCell>
              <TableCell>{m.mealName}</TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[300px] truncate" title={formatFoodItemsSummary(m.mealItems)}>
                {formatFoodItemsSummary(m.mealItems)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(m)} disabled={isRemoving}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit slot
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onRemove(m.id)}
                      className="text-destructive focus:text-destructive"
                      disabled={isRemoving}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from plan
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
