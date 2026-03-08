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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { DietPlanCombobox } from '@/components/diet-plans/diet-plan-combobox'
import { useCreateDietPlanAssignment } from '@/hooks/use-diet-plan-assignment-mutations'

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
}: AssignExistingPlanDialogProps) {
  const [dietPlanId, setDietPlanId] = useState<string | null>(preselectedPlanId ?? null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const create = useCreateDietPlanAssignment()

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
    }
  }, [open, preselectedPlanId])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setFormError(null)
      }
      onOpenChange(next)
    },
    [onOpenChange]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      await create.mutateAsync({
        memberId,
        dietPlanId,
        startDate,
        endDate,
      })
      handleOpenChange(false)
      onSuccess?.()
    } catch {
      setFormError('Failed to create assignment')
    }
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
