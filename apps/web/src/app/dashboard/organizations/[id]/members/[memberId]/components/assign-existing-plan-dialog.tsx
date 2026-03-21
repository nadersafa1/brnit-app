'use client'

import { useState, useEffect, useCallback } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DietPlanCombobox } from '@/components/diet-plans/diet-plan-combobox'
import { MealTimeAssignmentFields } from '@/components/diet-plans/meal-time-assignment-fields'
import { buildMealTimeOverridesPayload } from '@/lib/helpers/meal-time-assignment'
import { useCreateDietPlanAssignment } from '@/hooks/use-diet-plan-assignment-mutations'
import { useDietPlan } from '@/hooks/use-diet-plan'

interface AssignExistingPlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  preselectedPlanId?: string
  onSuccess?: () => void
}

export default function AssignExistingPlanDialog({
  open,
  onOpenChange,
  memberId,
  preselectedPlanId,
  onSuccess,
}: Readonly<AssignExistingPlanDialogProps>) {
  // --- Local form state for assignment window + per-meal time overrides ---
  const [dietPlanId, setDietPlanId] = useState<string | null>(preselectedPlanId ?? null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [mealTimesByMealId, setMealTimesByMealId] = useState<Record<string, string>>({})

  const create = useCreateDietPlanAssignment()
  const { data: selectedPlan } = useDietPlan(dietPlanId ?? '', 'nutritionist')

  useEffect(() => {
    if (preselectedPlanId) setDietPlanId(preselectedPlanId)
  }, [preselectedPlanId])

  useEffect(() => {
    if (open) {
      const today = new Date().toISOString().slice(0, 10)
      const end = new Date()
      end.setDate(end.getDate() + 30)
      setStartDate(today)
      setEndDate(end.toISOString().slice(0, 10))
      if (!preselectedPlanId) setDietPlanId(null)
      setFormError(null)
      setMealTimesByMealId({})
    }
  }, [open, preselectedPlanId])

  useEffect(() => {
    if (!open || !selectedPlan?.dietPlanMeals) return
    const next: Record<string, string> = {}
    for (const meal of selectedPlan.dietPlanMeals) {
      next[meal.id] = meal.scheduledTime ?? ''
    }
    setMealTimesByMealId(next)
  }, [open, selectedPlan])

  const handleMealTimeChange = useCallback((dietPlanMealId: string, value: string) => {
    setMealTimesByMealId(prev => ({
      ...prev,
      [dietPlanMealId]: value,
    }))
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setFormError(null)
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const handleSubmit: NonNullable<React.ComponentProps<'form'>['onSubmit']> = (e) => {
    e.preventDefault()
    void (async () => {
      setFormError(null)
      if (!dietPlanId) {
        setFormError('Please select a diet plan')
        return
      }
      if (!startDate || !endDate) {
        setFormError('Start and end dates are required')
        return
      }
      if (startDate > endDate) {
        setFormError('Start date must be before or equal to end date')
        return
      }
      try {
        // Persist only rows that differ from plan defaults (see meal-time-assignment helper).
        const mealTimeOverrides = selectedPlan?.dietPlanMeals
          ? buildMealTimeOverridesPayload(selectedPlan.dietPlanMeals, mealTimesByMealId)
          : []

        await create.mutateAsync({
          memberId,
          dietPlanId,
          startDate,
          endDate,
          mealTimeOverrides,
        })
        handleOpenChange(false)
        onSuccess?.()
      } catch {
        setFormError('Failed to create assignment')
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign diet plan</DialogTitle>
          <DialogDescription>
            Select a diet plan and set the assignment period.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <FieldLabel>Diet plan</FieldLabel>
            <DietPlanCombobox
              value={dietPlanId}
              onValueChange={setDietPlanId}
              placeholder="Select diet plan..."
            />
            <FieldError>{formError && !dietPlanId ? formError : null}</FieldError>
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>Start date</FieldLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </FieldGroup>
          <FieldGroup>
            <FieldLabel>End date</FieldLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {formError && startDate && endDate && startDate > endDate && (
              <FieldError>{formError}</FieldError>
            )}
          </FieldGroup>
          {!!selectedPlan?.dietPlanMeals?.length && (
            <FieldGroup>
              <FieldLabel>Meal times (optional)</FieldLabel>
              <MealTimeAssignmentFields
                meals={selectedPlan.dietPlanMeals}
                valuesByMealId={mealTimesByMealId}
                onChange={handleMealTimeChange}
              />
            </FieldGroup>
          )}
          {formError && (
            <p className="text-destructive text-sm">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!dietPlanId || create.isPending}>
              {create.isPending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
