'use client'

import { useState, useCallback, useEffect } from 'react'

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
import { useCreateAssessment } from '@/hooks/use-body-composition-assessments'
import type { Member } from 'better-auth/plugins'
import type { User } from 'better-auth/types'

interface AddAssessmentDialogProps {
  member: (Member & { user: User }) | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const toIsoDatetime = (value: string): string => {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}

export default function AddAssessmentDialog({
  member,
  open,
  onOpenChange,
  onSuccess,
}: AddAssessmentDialogProps) {
  const create = useCreateAssessment()
  const [file, setFile] = useState<File | null>(null)
  const [assessedAt, setAssessedAt] = useState('')
  const [bodyFatPercent, setBodyFatPercent] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [muscleMassKg, setMuscleMassKg] = useState('')
  const [visceralFatAreaCm2, setVisceralFatAreaCm2] = useState('')
  const [bodyWaterL, setBodyWaterL] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setBodyFatPercent('')
    setWeightKg('')
    setMuscleMassKg('')
    setVisceralFatAreaCm2('')
    setBodyWaterL('')
    setFormError(null)
    setFile(null)
  }, [])

  useEffect(() => {
    if (open) {
      const now = new Date()
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      setAssessedAt(local.toISOString().slice(0, 16))
    }
  }, [open])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!member) return

    setFormError(null)
    const isoAssessedAt = toIsoDatetime(assessedAt)
    if (!isoAssessedAt) {
      setFormError('Assessed at is required')
      return
    }

    const numBodyFat = Number(bodyFatPercent)
    const numWeight = Number(weightKg)
    const numMuscle = Number(muscleMassKg)
    const numVisceral = Number(visceralFatAreaCm2)
    const numWater = Number(bodyWaterL)

    if (
      Number.isNaN(numBodyFat) ||
      Number.isNaN(numWeight) ||
      Number.isNaN(numMuscle) ||
      Number.isNaN(numVisceral) ||
      Number.isNaN(numWater)
    ) {
      setFormError('All numeric fields must be valid numbers')
      return
    }

    await create.mutateAsync({
      memberId: member.id,
      assessedAt: isoAssessedAt,
      bodyFatPercent: numBodyFat,
      weightKg: numWeight,
      muscleMassKg: numMuscle,
      visceralFatAreaCm2: numVisceral,
      bodyWaterL: numWater,
      file: file ?? undefined,
    })

    handleOpenChange(false)
    onSuccess?.()
  }

  const memberName =
    member && (member as Member & { user?: { name?: string | null } }).user?.name
      ? (member as Member & { user: { name?: string | null } }).user.name ?? 'Member'
      : 'Member'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add assessment</DialogTitle>
          <DialogDescription>
            Add a body composition assessment for {memberName}. Height and BMI come from the member’s saved
            account preferences and this weight — they must set height in the app or under web account
            preferences first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="assessedAt">Assessed at</FieldLabel>
              <Input
                id="assessedAt"
                type="datetime-local"
                value={assessedAt}
                onChange={e => setAssessedAt(e.target.value)}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="weightKg">Weight (kg)</FieldLabel>
              <Input
                id="weightKg"
                type="number"
                step="0.01"
                min="0"
                max="999.99"
                value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="bodyFatPercent">Body fat (%)</FieldLabel>
                <Input
                  id="bodyFatPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={bodyFatPercent}
                  onChange={e => setBodyFatPercent(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="muscleMassKg">Muscle mass (kg)</FieldLabel>
                <Input
                  id="muscleMassKg"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={muscleMassKg}
                  onChange={e => setMuscleMassKg(e.target.value)}
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="visceralFatAreaCm2">Visceral fat (cm²)</FieldLabel>
                <Input
                  id="visceralFatAreaCm2"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  value={visceralFatAreaCm2}
                  onChange={e => setVisceralFatAreaCm2(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="bodyWaterL">Body water (L)</FieldLabel>
                <Input
                  id="bodyWaterL"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={bodyWaterL}
                  onChange={e => setBodyWaterL(e.target.value)}
                  required
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="file">InBody result image (optional)</FieldLabel>
              <Input
                id="file"
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
          </FieldGroup>

          {formError && (
            <FieldError className="text-destructive text-sm">{formError}</FieldError>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Add assessment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
