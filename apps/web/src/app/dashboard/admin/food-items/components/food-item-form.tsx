'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FoodItem } from '@/lib/queries/food-items'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { createFoodItemSchema, updateFoodItemSchema } from '@/types/api/food.schemas'

type CreateFormData = z.infer<typeof createFoodItemSchema>
type UpdateFormData = z.infer<typeof updateFoodItemSchema>

export type FoodItemFormSubmitOptions = { file?: File; clearImage?: boolean }

interface FoodItemFormProps {
  item?: FoodItem | null
  categories: FoodCategory[]
  onSubmit: (data: CreateFormData | UpdateFormData, options?: FoodItemFormSubmitOptions) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
}

export function FoodItemForm({ item, categories, onSubmit, onCancel, isLoading = false }: FoodItemFormProps) {
  const isEdit = !!item
  const schema = isEdit ? updateFoodItemSchema : createFoodItemSchema
  const [file, setFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)

  type FormValues = {
    name: string
    categoryId: string
    fdcId?: number
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    servingSize?: number
  }
  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: item?.name ?? '',
      categoryId: item?.categoryId ?? '',
      fdcId: item?.fdcId ?? undefined,
      calories: item?.calories ? Number.parseFloat(item.calories) : undefined,
      protein: item?.protein ? Number.parseFloat(item.protein) : undefined,
      carbs: item?.carbs ? Number.parseFloat(item.carbs) : undefined,
      fat: item?.fat ? Number.parseFloat(item.fat) : undefined,
      servingSize: item?.servingSize ? Number.parseFloat(item.servingSize) : undefined,
    },
  })

  const handleSubmit = form.handleSubmit(async raw => {
    const toNum = (v: unknown) => (typeof v === 'number' && !Number.isNaN(v) ? v : undefined)
    const payload: CreateFormData | UpdateFormData = {
      ...raw,
      fdcId: toNum(raw.fdcId),
      calories: toNum(raw.calories),
      protein: toNum(raw.protein),
      carbs: toNum(raw.carbs),
      fat: toNum(raw.fat),
      servingSize: toNum(raw.servingSize),
    }
    if (isEdit) {
      const u = payload as UpdateFormData
      u.fdcId = (payload as UpdateFormData).fdcId ?? null
      u.calories = (payload as UpdateFormData).calories ?? null
      u.protein = (payload as UpdateFormData).protein ?? null
      u.carbs = (payload as UpdateFormData).carbs ?? null
      u.fat = (payload as UpdateFormData).fat ?? null
      u.servingSize = (payload as UpdateFormData).servingSize ?? null
    } else {
      const c = payload as CreateFormData
      if (!c.name || !c.categoryId) return
    }
    const options: FoodItemFormSubmitOptions = {}
    if (file) options.file = file
    if (isEdit && clearImage) options.clearImage = true
    await onSubmit(payload, options)
    setFile(null)
    setClearImage(false)
    form.reset()
  })

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Field>
        <FieldLabel htmlFor='item-name'>Name</FieldLabel>
        <Input id='item-name' {...form.register('name')} placeholder='e.g. Apple' disabled={isLoading} />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor='item-category'>Category</FieldLabel>
        <Select
          value={form.watch('categoryId')}
          onValueChange={v => form.setValue('categoryId', v)}
          disabled={isLoading}
        >
          <SelectTrigger id='item-category'>
            <SelectValue placeholder='Select category' />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError errors={form.formState.errors.categoryId ? [form.formState.errors.categoryId] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor='item-fdcid'>FDC ID (optional)</FieldLabel>
        <Input
          id='item-fdcid'
          type='number'
          {...form.register('fdcId', { valueAsNumber: true })}
          placeholder='USDA FDC ID'
          disabled={isLoading}
        />
      </Field>

      <div className='grid grid-cols-2 gap-4'>
        <Field>
          <FieldLabel htmlFor='item-calories'>Calories</FieldLabel>
          <Input
            id='item-calories'
            type='number'
            step='0.01'
            {...form.register('calories', { valueAsNumber: true })}
            placeholder='0'
            disabled={isLoading}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='item-protein'>Protein (g)</FieldLabel>
          <Input
            id='item-protein'
            type='number'
            step='0.01'
            {...form.register('protein', { valueAsNumber: true })}
            placeholder='0'
            disabled={isLoading}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='item-carbs'>Carbs (g)</FieldLabel>
          <Input
            id='item-carbs'
            type='number'
            step='0.01'
            {...form.register('carbs', { valueAsNumber: true })}
            placeholder='0'
            disabled={isLoading}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='item-fat'>Fat (g)</FieldLabel>
          <Input
            id='item-fat'
            type='number'
            step='0.01'
            {...form.register('fat', { valueAsNumber: true })}
            placeholder='0'
            disabled={isLoading}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor='item-serving'>Serving size (optional)</FieldLabel>
        <Input
          id='item-serving'
          type='number'
          step='0.01'
          {...form.register('servingSize', { valueAsNumber: true })}
          placeholder='e.g. 100'
          disabled={isLoading}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor='item-image'>{isEdit ? 'Replace image (optional)' : 'Image (optional)'}</FieldLabel>
        <Input
          id='item-image'
          type='file'
          accept='image/*'
          className='cursor-pointer'
          disabled={isLoading}
          onChange={e => {
            const f = e.target.files?.[0]
            setFile(f ?? null)
            if (f) setClearImage(false)
          }}
        />
      </Field>

      {isEdit && item?.imageUrl && !clearImage && (
        <Field>
          <div className='flex items-center gap-2'>
            <Checkbox
              id='item-clearImage'
              checked={clearImage}
              onCheckedChange={v => {
                setClearImage(v === true)
                if (v === true) setFile(null)
              }}
            />
            <Label htmlFor='item-clearImage' className='cursor-pointer font-normal'>
              Remove current image
            </Label>
          </div>
        </Field>
      )}

      <div className='flex gap-2 justify-end'>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type='submit' disabled={isLoading}>
          {isLoading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
