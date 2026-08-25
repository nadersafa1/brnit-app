'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { DayNumberSelect } from '@/components/diet-plan/day-number-select'
import { useMeals } from '@/hooks/use-meals'
import { useMeal } from '@/hooks/use-meal'
import type { DataSource } from '@/lib/queries/keys'
import type { DietPlanMeal } from '@/lib/queries/diet-plans'

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function formatFoodItemsSummary(
  mealItems?: Array<{ foodName: string; quantity: number }>
): string {
  if (!mealItems || mealItems.length === 0) return ''
  return mealItems.map((mi) => `${mi.foodName} ${mi.quantity}g`).join(', ')
}

export interface DietPlanMealUpdateInput {
  dietPlanMealId: string
  mealId?: string
  dayNumber?: number
  mealType?: string
  mealOrder?: number
  scheduledTime?: string | null
}

interface EditDietPlanMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slot: DietPlanMeal | null
  onUpdate: (input: DietPlanMealUpdateInput) => Promise<void>
  source?: DataSource
}

export function EditDietPlanMealDialog({
  open,
  onOpenChange,
  slot,
  onUpdate,
  source = 'admin',
}: Readonly<EditDietPlanMealDialogProps>) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [mealId, setMealId] = useState('')
  const [dayNumber, setDayNumber] = useState(0)
  const [mealType, setMealType] = useState('breakfast')
  const [mealOrder, setMealOrder] = useState(1)
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    if (slot && open) {
      setMealId(slot.mealId)
      setDayNumber(slot.dayNumber)
      setMealType(slot.mealType)
      setMealOrder(slot.mealOrder)
      setScheduledTime(slot.scheduledTime ?? '')
      setSearchInput('')
      setDebouncedSearch('')
    }
  }, [slot, open])

  const { data: meals, isLoading } = useMeals(
    {
      page: 1,
      perPage: 100,
      q: debouncedSearch.trim() || undefined,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    source
  )

  const { data: selectedMeal } = useMeal(mealId || '', source)
  const foodItemsPreview = useMemo(
    () => formatFoodItemsSummary(selectedMeal?.mealItems),
    [selectedMeal?.mealItems]
  )

  const mealsListContent = (() => {
    if (isLoading) {
      return <div className="p-4 text-sm text-muted-foreground">Loading…</div>
    }
    if (!meals?.length) {
      return <div className="p-4 text-sm text-muted-foreground">No meals found.</div>
    }
    return (
      <div className="divide-y">
        {meals.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`w-full px-4 py-2 text-left text-sm hover:bg-muted/50 ${
              mealId === m.id ? 'bg-muted' : ''
            }`}
            onClick={() => setMealId(m.id)}
          >
            <span className="font-medium">{m.name}</span>
          </button>
        ))}
      </div>
    )
  })()

  const handleOpenChange = (next: boolean) => {
    if (!next) onOpenChange(false)
  }

  const handleSave = async () => {
    if (!slot) return
    await onUpdate({
      dietPlanMealId: slot.id,
      mealId,
      dayNumber,
      mealType,
      mealOrder,
      scheduledTime: scheduledTime || null,
    })
    onOpenChange(false)
  }

  if (!slot) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit meal slot</DialogTitle>
          <DialogDescription>
            Change the day, meal type, meal, or order for this slot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <Field>
            <FieldLabel htmlFor="edit-meal-search">Search meals</FieldLabel>
            <Input
              id="edit-meal-search"
              placeholder="Search by name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </Field>

          <div className="flex-1 overflow-auto rounded-md border min-h-[120px] max-h-[200px]">
            {mealsListContent}
          </div>

          {selectedMeal && foodItemsPreview && (
            <div className="rounded-md border bg-muted/30 px-3 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Food items in this meal</p>
              <p className="text-sm truncate" title={foodItemsPreview}>
                {foodItemsPreview}
              </p>
            </div>
          )}

          <DayNumberSelect value={dayNumber} onChange={setDayNumber} id="edit-meal-day" />

          <Field>
            <FieldLabel htmlFor="edit-meal-type">Meal type</FieldLabel>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger id="edit-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-meal-order">Order</FieldLabel>
            <Input
              id="edit-meal-order"
              type="number"
              min={1}
              value={mealOrder}
              onChange={(e) => setMealOrder(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="edit-meal-time">Default time (optional)</FieldLabel>
            <Input
              id="edit-meal-time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!mealId}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
