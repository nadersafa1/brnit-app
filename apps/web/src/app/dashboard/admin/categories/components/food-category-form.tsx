'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { createFoodCategorySchema } from '@/types/api/food.schemas'

const schema = createFoodCategorySchema
type FormData = z.infer<typeof schema>

interface FoodCategoryFormProps {
  category?: FoodCategory | null
  onSubmit: (data: FormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function FoodCategoryForm({
  category,
  onSubmit,
  onCancel,
  isLoading = false,
}: FoodCategoryFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '' },
  })

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data)
    form.reset()
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="category-name">Name</FieldLabel>
        <Input
          id="category-name"
          {...form.register('name')}
          placeholder="e.g. Vegetables"
          disabled={isLoading}
        />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving…' : category ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
