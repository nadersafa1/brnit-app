'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { createMealSchema } from '@/types/api/meal.schemas'

const schema = createMealSchema.pick({ name: true, description: true })
type FormData = z.infer<typeof schema>

interface MealFormProps {
  defaultValues?: Partial<FormData>
  onSubmit: (data: FormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function MealForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: MealFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit({ ...data, description: data.description || undefined })
    form.reset()
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="meal-name">Name</FieldLabel>
        <Input
          id="meal-name"
          {...form.register('name')}
          placeholder="e.g. Breakfast Bowl"
          disabled={isLoading}
        />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>
      <Field>
        <FieldLabel htmlFor="meal-description">Description (optional)</FieldLabel>
        <Input
          id="meal-description"
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
          {isLoading ? 'Saving…' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
