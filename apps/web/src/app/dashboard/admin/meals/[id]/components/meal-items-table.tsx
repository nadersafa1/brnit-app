'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import type { MealItem } from '@/lib/queries/meals'
import { getMacroFactor } from '@/lib/helpers/macros'
import { mealQuantityStep } from '@/lib/helpers/food-unit-display'

interface MealItemsTableProps {
  mealItems: MealItem[]
  onQuantityChange: (mealItemId: string, quantity: number) => Promise<void>
  onRemove: (mealItemId: string) => Promise<void>
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

/** Nutrition values are per 1 unit (per 100g or per the food’s chosen measure). */
function scaleNutrient(
  perUnit: number | null,
  quantity: number,
  unit: MealItem['unit']
): string {
  if (perUnit == null) return '–'
  const factor = getMacroFactor(quantity, unit)
  const v = Math.round(factor * perUnit * 10) / 10
  return String(v)
}

function formatQuantityQty(quantity: number): string {
  return Number.isInteger(quantity) || quantity % 1 === 0
    ? String(quantity)
    : (Math.round(quantity * 1000) / 1000).toString()
}

function formatQuantityWithUnit(quantity: number, unit: MealItem['unit']): string {
  if (unit === 'piece') return `${quantity} pcs`
  if (unit === 'liters') {
    const q = formatQuantityQty(quantity)
    return `${q}L`
  }
  if (unit === 'cup') {
    const q = formatQuantityQty(quantity)
    return `${q} cup${quantity === 1 ? '' : 's'}`
  }
  if (unit === 'tbsp') return `${formatQuantityQty(quantity)} tbsp`
  return `${quantity} g`
}

export function MealItemsTable({
  mealItems,
  onQuantityChange,
  onRemove,
  selectedIds,
  onSelectionChange,
}: Readonly<MealItemsTableProps>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(x => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === mealItems.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(mealItems.map(m => m.id))
    }
  }

  const startEdit = (item: MealItem) => {
    setEditingId(item.id)
    setEditValue(String(item.quantity))
  }

  const submitEdit = async () => {
    if (!editingId) return
    const q = Number.parseFloat(editValue)
    if (!Number.isNaN(q) && q > 0) {
      await onQuantityChange(editingId, q)
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  if (mealItems.length === 0) {
    return (
      <div className='rounded-md border p-8'>
        <p className='text-sm text-muted-foreground'>No food items. Add your first food item.</p>
      </div>
    )
  }

  return (
    <div className='rounded-md border overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-12'>
              <Checkbox
                checked={selectedIds.length === mealItems.length && mealItems.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </TableHead>
            <TableHead>Food name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Cal</TableHead>
            <TableHead>P</TableHead>
            <TableHead>C</TableHead>
            <TableHead>F</TableHead>
            <TableHead className='w-12' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {mealItems.map(item => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={() => toggleSelect(item.id)} />
              </TableCell>
              <TableCell className='font-medium'>{item.foodName}</TableCell>
              <TableCell className='text-muted-foreground'>{item.categoryName ?? '–'}</TableCell>
              <TableCell>
                {editingId === item.id ? (
                  <div className='flex items-center gap-1'>
                    <Input
                      type='number'
                      min={0.1}
                      step={mealQuantityStep(item.unit)}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      className='w-20 h-8'
                      onBlur={submitEdit}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                  </div>
                ) : (
                  <button type='button' className='hover:underline text-left' onClick={() => startEdit(item)}>
                    {formatQuantityWithUnit(item.quantity, item.unit)}
                  </button>
                )}
              </TableCell>
              <TableCell>{scaleNutrient(item.calories, item.quantity, item.unit)}</TableCell>
              <TableCell>{scaleNutrient(item.protein, item.quantity, item.unit)}</TableCell>
              <TableCell>{scaleNutrient(item.carbs, item.quantity, item.unit)}</TableCell>
              <TableCell>{scaleNutrient(item.fat, item.quantity, item.unit)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-8 w-8'>
                      <MoreHorizontal className='h-4 w-4' />
                      <span className='sr-only'>Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => startEdit(item)}>
                      <Pencil className='mr-2 h-4 w-4' />
                      Edit quantity
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onRemove(item.id)}
                      className='text-destructive focus:text-destructive'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      Remove from meal
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
