'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateDietPlan } from '@/hooks/use-diet-plan-mutations'
import { AddDietPlanMealDialog, type DietPlanMealInput } from './add-diet-plan-meal-dialog'
import { formatDayNumberDisplay } from '@/components/diet-plan/day-number-select'

import type { DataSource } from '@/lib/queries/keys'

interface CreateDietPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onSuccessWithPlanId?: (planId: string) => void
  source?: DataSource
}

function getMealIdentity(meal: DietPlanMealInput): string {
  return `${meal.mealId}-${meal.dayNumber}-${meal.mealType}-${meal.mealOrder}`
}

export function CreateDietPlanDialog({
  open,
  onOpenChange,
  onSuccess,
  onSuccessWithPlanId,
  source = 'admin',
}: Readonly<CreateDietPlanDialogProps>) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [meals, setMeals] = useState<DietPlanMealInput[]>([])
  const [addMealOpen, setAddMealOpen] = useState(false)

  const create = useCreateDietPlan(source)

  const reset = () => {
    setName('')
    setDescription('')
    setMeals([])
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleAddMeal = (meal: DietPlanMealInput) => {
    setMeals((prev) => [...prev, meal])
  }

  const handleRemoveMeal = (mealIdentity: string) => {
    setMeals((prev) => prev.filter((meal) => getMealIdentity(meal) !== mealIdentity))
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    const result = await create.mutateAsync({
      name: name.trim(),
      description: description.trim() || undefined,
      dietPlanMeals: meals.map((m) => ({
        mealId: m.mealId,
        dayNumber: m.dayNumber,
        mealType: m.mealType,
        mealOrder: m.mealOrder,
        scheduledTime: m.scheduledTime,
      })),
    })
    handleOpenChange(false)
    const planId = result?.data?.id
    if (planId) onSuccessWithPlanId?.(planId)
    onSuccess?.()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create diet plan</DialogTitle>
            <DialogDescription>
              Create a reusable diet plan template. Add meals and use &quot;All days&quot; for meals that repeat every day.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label htmlFor="plan-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="plan-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 7-Day Cleanse"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="plan-desc" className="text-sm font-medium">
                Description (optional)
              </label>
              <Input
                id="plan-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
                className="mt-1"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Meals</span>
                <Button type="button" size="sm" variant="outline" onClick={() => setAddMealOpen(true)}>
                  Add meal
                </Button>
              </div>
              {meals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No meals added. Click Add meal to add slots.</p>
              ) : (
                <ul className="text-sm space-y-1 border rounded-md p-2 max-h-32 overflow-auto">
                  {meals.map((m) => (
                    <li key={getMealIdentity(m)} className="flex justify-between items-center gap-2">
                      <span>
                        {formatDayNumberDisplay(m.dayNumber)} · {m.mealType} · Meal #{m.mealOrder}
                        {m.scheduledTime ? ` · ${m.scheduledTime}` : ''}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-1 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMeal(getMealIdentity(m))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!name.trim() || create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddDietPlanMealDialog
        open={addMealOpen}
        onOpenChange={setAddMealOpen}
        onAdd={handleAddMeal}
        source={source}
      />
    </>
  )
}
