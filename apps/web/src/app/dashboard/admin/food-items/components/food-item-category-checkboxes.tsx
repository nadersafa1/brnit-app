'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { sortFoodCategoriesLockedFirst } from '@/lib/helpers/sort-food-categories-locked-first'
import type { FoodCategory } from '@/lib/queries/food-categories'

interface FoodItemCategoryCheckboxesProps {
  readonly categories: FoodCategory[]
  readonly selectedIds: string[]
  readonly onToggle: (categoryId: string, checked: boolean) => void
  readonly disabled?: boolean
  /** Checked and disabled; cannot be removed (e.g. category detail “add item” flow). */
  readonly lockedCategoryIds?: string[]
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
  lockedCategoryIds = [],
  categoryFieldError,
}: FoodItemCategoryCheckboxesProps) {
  const locked = new Set(lockedCategoryIds)
  const sortedCategories = sortFoodCategoriesLockedFirst(categories, lockedCategoryIds)

  return (
    <Field>
      <FieldLabel>Categories</FieldLabel>
      <p className='text-muted-foreground mb-2 text-sm'>
        {locked.size > 0
          ? 'Categories marked “always” are required. Optionally select additional categories.'
          : 'Select one or more.'}
      </p>
      <div className='flex max-h-40 flex-col gap-2 overflow-y-auto rounded-md border p-3'>
        {sortedCategories.map((c) => {
          const isLocked = locked.has(c.id)
          return (
            <div key={c.id} className='flex items-center gap-2'>
              <Checkbox
                id={`cat-${c.id}`}
                checked={isLocked || selectedIds.includes(c.id)}
                onCheckedChange={(v) => onToggle(c.id, v === true)}
                disabled={disabled || isLocked}
              />
              <Label
                htmlFor={`cat-${c.id}`}
                className={isLocked ? 'font-normal text-muted-foreground' : 'cursor-pointer font-normal'}
              >
                {c.name}
                {isLocked ? <span className='text-muted-foreground'> (always)</span> : null}
              </Label>
            </div>
          )
        })}
      </div>
      <FieldError errors={categoryFieldError ? [categoryFieldError] : undefined} />
    </Field>
  )
}
