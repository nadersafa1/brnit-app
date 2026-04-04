'use client'

import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { createFoodCategorySchema } from '@/types/api/food.schemas'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const schema = createFoodCategorySchema
type FormData = z.infer<typeof schema>

interface FoodCategoryFormProps {
  category?: FoodCategory | null
  onSubmit: (data: FormData) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function FoodCategoryForm({ category, onSubmit, onCancel, isLoading = false }: Readonly<FoodCategoryFormProps>) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  })

  // useEffect(() => {
  //   form.reset({
  //     name: category?.name ?? '',
  //     description: category?.description ?? '',
  //   })
  // }, [category?.id, category?.name, category?.description, form])

  const handleSubmit = form.handleSubmit(async data => {
    await onSubmit(data)
    form.reset()
  })

  let submitLabel = 'Create'
  if (category) {
    submitLabel = 'Update'
  }
  if (isLoading) {
    submitLabel = 'Saving…'
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Field>
        <FieldLabel htmlFor='category-name'>Name</FieldLabel>
        <Input id='category-name' {...form.register('name')} placeholder='e.g. Vegetables' disabled={isLoading} />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>
      <Field>
        <FieldLabel htmlFor='category-description'>Description</FieldLabel>
        <Textarea
          id='category-description'
          rows={4}
          {...form.register('description')}
          placeholder='Optional details shown to members in the app when relevant.'
          disabled={isLoading}
          className='min-h-[100px] resize-y'
        />
        <FieldError errors={form.formState.errors.description ? [form.formState.errors.description] : undefined} />
      </Field>
      <div className='flex gap-2 justify-end'>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type='submit' disabled={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
