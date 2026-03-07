'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { createDietPlanSchema } from '@/types/api/diet-plan.schemas'

const schema = createDietPlanSchema.pick({ name: true, description: true })
type FormData = z.infer<typeof schema>

interface DietPlanFormProps {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  submitLabel?: string
}

export function DietPlanForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Save',
}: DietPlanFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({ ...data, description: data.description || undefined })
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="diet-plan-name">Name</FieldLabel>
        <Input
          id="diet-plan-name"
          {...form.register('name')}
          placeholder="e.g. 7-Day Cleanse"
          disabled={isLoading}
        />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>
      <Field>
        <FieldLabel htmlFor="diet-plan-description">Description (optional)</FieldLabel>
        <Input
          id="diet-plan-description"
          {...form.register('description')}
          placeholder="Brief description"
          disabled={isLoading}
        />
        <FieldError errors={form.formState.errors.description ? [form.formState.errors.description] : undefined} />
      </Field>
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
