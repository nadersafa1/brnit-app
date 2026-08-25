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
import { useUpdateAssessment } from '@/hooks/use-body-composition-assessments'
import type { BodyCompositionAssessment } from '@/hooks/use-body-composition-assessments'

interface EditAssessmentDialogProps {
  assessment: BodyCompositionAssessment | null
  memberId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const toLocalDatetime = (iso: string): string => {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export default function EditAssessmentDialog({
  assessment,
  memberId,
  open,
  onOpenChange,
  onSuccess,
}: EditAssessmentDialogProps) {
  const update = useUpdateAssessment()
  const [file, setFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)
  const [assessedAt, setAssessedAt] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [bodyFatPercent, setBodyFatPercent] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [bmi, setBmi] = useState('')
  const [muscleMassKg, setMuscleMassKg] = useState('')
  const [visceralFatAreaCm2, setVisceralFatAreaCm2] = useState('')
  const [bodyWaterL, setBodyWaterL] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (assessment) {
      setAssessedAt(toLocalDatetime(assessment.assessedAt))
      setHeightCm(assessment.heightCm ?? '')
      setBodyFatPercent(assessment.bodyFatPercent ?? '')
      setWeightKg(assessment.weightKg ?? '')
      setBmi(assessment.bmi ?? '')
      setMuscleMassKg(assessment.muscleMassKg ?? '')
      setVisceralFatAreaCm2(assessment.visceralFatAreaCm2 ?? '')
      setBodyWaterL(assessment.bodyWaterL ?? '')
      setClearImage(false)
      setFile(null)
      setFormError(null)
    }
  }, [assessment])

  const reset = useCallback(() => {
    setFile(null)
    setClearImage(false)
    setFormError(null)
  }, [])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset()
      onOpenChange(next)
    },
    [onOpenChange, reset]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assessment) return

    setFormError(null)

    const isoAssessedAt = assessedAt
      ? new Date(assessedAt).toISOString()
      : assessment.assessedAt

    const data: Record<string, string | number | boolean | File> = {}
    if (assessedAt) data.assessedAt = isoAssessedAt
    if (heightCm !== '') data.heightCm = Number(heightCm)
    if (bodyFatPercent !== '') data.bodyFatPercent = Number(bodyFatPercent)
    if (weightKg !== '') data.weightKg = Number(weightKg)
    if (bmi !== '') data.bmi = Number(bmi)
    if (muscleMassKg !== '') data.muscleMassKg = Number(muscleMassKg)
    if (visceralFatAreaCm2 !== '') data.visceralFatAreaCm2 = Number(visceralFatAreaCm2)
    if (bodyWaterL !== '') data.bodyWaterL = Number(bodyWaterL)
    if (clearImage) data.clearImage = true
    if (file) data.file = file

    if (Object.keys(data).length === 0) {
      setFormError('At least one field must be changed')
      return
    }

    await update.mutateAsync({
      id: assessment.id,
      memberId,
      ...data,
    })

    handleOpenChange(false)
    onSuccess?.()
  }

  if (!assessment) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit assessment</DialogTitle>
          <DialogDescription>
            Update body composition metrics for this assessment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-assessedAt">Assessed at</FieldLabel>
              <Input
                id="edit-assessedAt"
                type="datetime-local"
                value={assessedAt}
                onChange={e => setAssessedAt(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-heightCm">Height (cm)</FieldLabel>
                <Input
                  id="edit-heightCm"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={heightCm}
                  onChange={e => setHeightCm(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-weightKg">Weight (kg)</FieldLabel>
                <Input
                  id="edit-weightKg"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={weightKg}
                  onChange={e => setWeightKg(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="edit-bmi">BMI</FieldLabel>
              <Input
                id="edit-bmi"
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={bmi}
                onChange={e => setBmi(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-bodyFatPercent">Body fat (%)</FieldLabel>
                <Input
                  id="edit-bodyFatPercent"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={bodyFatPercent}
                  onChange={e => setBodyFatPercent(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-muscleMassKg">Muscle mass (kg)</FieldLabel>
                <Input
                  id="edit-muscleMassKg"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={muscleMassKg}
                  onChange={e => setMuscleMassKg(e.target.value)}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="edit-visceralFatAreaCm2">Visceral fat (cm²)</FieldLabel>
                <Input
                  id="edit-visceralFatAreaCm2"
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  value={visceralFatAreaCm2}
                  onChange={e => setVisceralFatAreaCm2(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-bodyWaterL">Body water (L)</FieldLabel>
                <Input
                  id="edit-bodyWaterL"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999.99"
                  value={bodyWaterL}
                  onChange={e => setBodyWaterL(e.target.value)}
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="edit-file">Replace InBody result image (optional)</FieldLabel>
              <Input
                id="edit-file"
                type="file"
                accept="image/*"
                className="cursor-pointer"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>

            {assessment.imageUrl && (
              <Field>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-clearImage"
                    checked={clearImage}
                    onChange={e => setClearImage(e.target.checked)}
                    className="rounded border-input"
                  />
                  <FieldLabel htmlFor="edit-clearImage" className="!mt-0 cursor-pointer">
                    Remove current image
                  </FieldLabel>
                </div>
              </Field>
            )}
          </FieldGroup>

          {formError && (
            <FieldError className="text-destructive text-sm">{formError}</FieldError>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
