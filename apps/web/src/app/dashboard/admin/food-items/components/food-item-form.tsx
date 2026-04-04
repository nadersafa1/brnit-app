'use client'

import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FoodItem } from '@/lib/queries/food-items'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { z } from 'zod'
import {
  createFoodItemSchema,
  updateFoodItemSchema,
  type FoodUnit,
} from '@/types/api/food.schemas'
import { gramsPerUnitPlaceholder } from '@/lib/helpers/food-unit-display'
import { buildFoodItemSubmitPayload, withMergedLockedCategoryIds } from '@/lib/helpers/food-item-form-payload'
import { FoodItemCategoryCheckboxes } from './food-item-category-checkboxes'

type CreateFormData = z.infer<typeof createFoodItemSchema>
type UpdateFormData = z.infer<typeof updateFoodItemSchema>

export type FoodItemFormSubmitOptions = { file?: File; clearImage?: boolean }

interface FoodItemFormProps {
  readonly item?: FoodItem | null
  readonly categories: FoodCategory[]
  /** Create mode only: these IDs are always sent and cannot be unchecked (e.g. current category on detail page). */
  readonly lockedCategoryIds?: string[]
  readonly onSubmit: (data: CreateFormData | UpdateFormData, options?: FoodItemFormSubmitOptions) => Promise<void>
  readonly onCancel?: () => void
  readonly isLoading?: boolean
}

type FormValues = {
  name: string
  categoryIds: string[]
  calories: number
  protein: number
  carbs: number
  fat: number
  unit: FoodUnit
  gramsPerUnit?: number | null
}

export function FoodItemForm({
  item,
  categories,
  lockedCategoryIds: lockedCategoryIdsProp,
  onSubmit,
  onCancel,
  isLoading = false,
}: Readonly<FoodItemFormProps>) {
  const isEdit = Boolean(item)
  // Locked IDs apply only when creating; edits use the item’s existing links from the API.
  const lockedCategoryIds = isEdit ? [] : (lockedCategoryIdsProp ?? [])
  const schema = isEdit ? updateFoodItemSchema : createFoodItemSchema
  const [file, setFile] = useState<File | null>(null)
  const [clearImage, setClearImage] = useState(false)

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: item?.name ?? '',
      categoryIds: item?.categories?.map((c) => c.id) ?? [...lockedCategoryIds],
      calories: item?.calories ?? 0,
      protein: item?.protein ?? 0,
      carbs: item?.carbs ?? 0,
      fat: item?.fat ?? 0,
      unit: item?.unit ?? '100g',
      gramsPerUnit: item?.gramsPerUnit ?? undefined,
    },
  })

  const unit = form.watch('unit')
  const selectedCategoryIds = form.watch('categoryIds') ?? []

  const submitLabel = resolveFoodItemFormSubmitLabel(isLoading, isEdit)

  const toggleCategory = useCallback(
    (categoryId: string, checked: boolean) => {
      if (lockedCategoryIds.includes(categoryId)) return
      const current = form.getValues('categoryIds') ?? []
      const next = checked ? [...current, categoryId] : current.filter((id) => id !== categoryId)
      form.setValue('categoryIds', next, { shouldValidate: true })
    },
    [form, lockedCategoryIds]
  )

  // Merge locked categories into the payload on create (see withMergedLockedCategoryIds).
  const handleSubmit = form.handleSubmit(async (raw) => {
    const payload = buildFoodItemSubmitPayload(withMergedLockedCategoryIds(raw, isEdit, lockedCategoryIds), isEdit)
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
      {/* Core identity */}
      <Field>
        <FieldLabel htmlFor='item-name'>Name</FieldLabel>
        <Input id='item-name' {...form.register('name')} placeholder='e.g. Apple' disabled={isLoading} />
        <FieldError errors={form.formState.errors.name ? [form.formState.errors.name] : undefined} />
      </Field>

      <FoodItemCategoryCheckboxes
        categories={categories}
        selectedIds={selectedCategoryIds}
        onToggle={toggleCategory}
        disabled={isLoading}
        lockedCategoryIds={lockedCategoryIds}
        categoryFieldError={form.formState.errors.categoryIds}
      />

      {/* Macros — same layout for create and edit */}
      <div className='grid grid-cols-2 gap-4'>
        <Field>
          <FieldLabel htmlFor='item-calories'>Calories</FieldLabel>
          <Input
            id='item-calories'
            type='number'
            step='0.1'
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
            step='0.1'
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
            step='0.1'
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
            step='0.1'
            {...form.register('fat', { valueAsNumber: true })}
            placeholder='0'
            disabled={isLoading}
          />
        </Field>
      </div>

      {/* Unit drives whether grams-per-unit is required (Zod refine matches API rules) */}
      <Field>
        <FieldLabel htmlFor='item-unit'>Unit</FieldLabel>
        <Select
          value={form.watch('unit')}
          onValueChange={(v) => {
            form.setValue('unit', v as FoodUnit)
            if (v === '100g') form.setValue('gramsPerUnit', undefined)
          }}
          disabled={isLoading}
        >
          <SelectTrigger id='item-unit'>
            <SelectValue placeholder='Select unit' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='100g'>100g (per 100 grams)</SelectItem>
            <SelectItem value='piece'>Piece (per 1 item)</SelectItem>
            <SelectItem value='liters'>L (per 1 liter)</SelectItem>
            <SelectItem value='cup'>Cup (per 1 cup)</SelectItem>
            <SelectItem value='tbsp'>Tbsp (per 1 tablespoon)</SelectItem>
          </SelectContent>
        </Select>
        <FieldError errors={form.formState.errors.unit ? [form.formState.errors.unit] : undefined} />
      </Field>

      {unit !== '100g' && (
        <Field>
          <FieldLabel htmlFor='item-grams-per-unit'>
            Grams per unit (required when not 100g — grams in one piece, 1 L, 1 cup, 1 tbsp, etc.)
          </FieldLabel>
          <Input
            id='item-grams-per-unit'
            type='number'
            step='0.1'
            min={0.1}
            {...form.register('gramsPerUnit', { valueAsNumber: true })}
            placeholder={gramsPerUnitPlaceholder(unit)}
            disabled={isLoading}
          />
          <FieldError errors={form.formState.errors.gramsPerUnit ? [form.formState.errors.gramsPerUnit] : undefined} />
        </Field>
      )}

      {/* Optional image: file replaces on save; edit can clear existing without uploading */}
      <Field>
        <FieldLabel htmlFor='item-image'>{isEdit ? 'Replace image (optional)' : 'Image (optional)'}</FieldLabel>
        <Input
          id='item-image'
          type='file'
          accept='image/*'
          className='cursor-pointer'
          disabled={isLoading}
          onChange={(e) => {
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
              onCheckedChange={(v) => {
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
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function resolveFoodItemFormSubmitLabel(isLoading: boolean, isEdit: boolean): string {
  if (isLoading) return 'Saving…'
  if (isEdit) return 'Update'
  return 'Create'
}
