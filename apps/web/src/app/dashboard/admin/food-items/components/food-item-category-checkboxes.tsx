'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import type { FoodCategory } from '@/lib/queries/food-categories'

interface FoodItemCategoryCheckboxesProps {
  readonly categories: FoodCategory[]
  readonly selectedIds: string[]
  readonly onToggle: (categoryId: string, checked: boolean) => void
  readonly disabled?: boolean
  /** Zod/RHF error for the whole `categoryIds` array field */
  readonly categoryFieldError?: { message?: string }
}

/**
 * Many-to-many category picker for admin food create/edit.
 * Selection is sent as repeated `categoryIds` entries in multipart FormData.
 */
export function FoodItemCategoryCheckboxes({
  categories,
  selectedIds,
  onToggle,
  disabled,
  categoryFieldError,
}: FoodItemCategoryCheckboxesProps) {
  return (
    <Field>
      <FieldLabel>Categories</FieldLabel>
      <p className='text-muted-foreground mb-2 text-sm'>Select one or more.</p>
      <div className='flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border p-3'>
        {categories.map((c) => (
          <div key={c.id} className='flex items-center gap-2'>
            <Checkbox
              id={`cat-${c.id}`}
              checked={selectedIds.includes(c.id)}
              onCheckedChange={(v) => onToggle(c.id, v === true)}
              disabled={disabled}
            />
            <Label htmlFor={`cat-${c.id}`} className='cursor-pointer font-normal'>
              {c.name}
            </Label>
          </div>
        ))}
      </div>
      <FieldError errors={categoryFieldError ? [categoryFieldError] : undefined} />
    </Field>
  )
}
