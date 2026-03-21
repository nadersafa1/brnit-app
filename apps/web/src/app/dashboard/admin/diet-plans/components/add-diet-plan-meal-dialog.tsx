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

export interface DietPlanMealInput {
  mealId: string
  dayNumber: number
  mealType: string
  mealOrder: number
  scheduledTime?: string
}

interface AddDietPlanMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (meal: DietPlanMealInput) => void
  source?: DataSource
}

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack']

function formatFoodItemsSummary(
  mealItems?: Array<{ foodName: string; quantity: number }>
): string {
  if (!mealItems || mealItems.length === 0) return ''
  return mealItems.map((mi) => `${mi.foodName} ${mi.quantity}g`).join(', ')
}

export function AddDietPlanMealDialog({
  open,
  onOpenChange,
  onAdd,
  source = 'admin',
}: Readonly<AddDietPlanMealDialogProps>) {
  const [searchInput, setSearchInput] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedMealId, setSelectedMealId] = useState<string | null>(null)
  const [dayNumber, setDayNumber] = useState(0)
  const [mealType, setMealType] = useState('breakfast')
  const [mealOrder, setMealOrder] = useState(1)
  const [scheduledTime, setScheduledTime] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

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

  const { data: selectedMeal } = useMeal(
    selectedMealId ?? '',
    source
  )

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
              selectedMealId === m.id ? 'bg-muted' : ''
            }`}
            onClick={() => setSelectedMealId(m.id)}
          >
            <span className="font-medium">{m.name}</span>
          </button>
        ))}
      </div>
    )
  })()

  const reset = () => {
    setSearchInput('')
    setDebouncedSearch('')
    setSelectedMealId(null)
    setDayNumber(0)
    setMealType('breakfast')
    setMealOrder(1)
    setScheduledTime('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleAdd = () => {
    if (!selectedMealId) return
    onAdd({
      mealId: selectedMealId,
      dayNumber,
      mealType,
      mealOrder,
      scheduledTime: scheduledTime || undefined,
    })
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col max-w-lg">
        <DialogHeader>
          <DialogTitle>Add meal to plan</DialogTitle>
          <DialogDescription>
            Search and select a meal, then set day and type. Use &quot;All days&quot; for meals that repeat every day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <Field>
            <FieldLabel htmlFor="add-meal-search">Search meals</FieldLabel>
            <Input
              id="add-meal-search"
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

          <DayNumberSelect
            value={dayNumber}
            onChange={setDayNumber}
            id="add-meal-day"
          />

          <Field>
            <FieldLabel htmlFor="add-meal-type">Meal type</FieldLabel>
            <Select value={mealType} onValueChange={setMealType}>
              <SelectTrigger id="add-meal-type">
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
            <FieldLabel htmlFor="add-meal-order">Order</FieldLabel>
            <Input
              id="add-meal-order"
              type="number"
              min={1}
              value={mealOrder}
              onChange={(e) => setMealOrder(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="add-meal-time">Default time (optional)</FieldLabel>
            <Input
              id="add-meal-time"
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
          <Button onClick={handleAdd} disabled={!selectedMealId}>
            Add
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
