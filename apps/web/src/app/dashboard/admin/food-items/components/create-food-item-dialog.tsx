'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FoodItemForm, type FoodItemFormSubmitOptions } from './food-item-form'
import type { CreateFoodItem, UpdateFoodItem } from '@/types/api/food.schemas'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { useCreateFoodItem } from '@/hooks/use-food-mutations'

interface CreateFoodItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  categories: FoodCategory[]
  /** Always linked to the new item; user can add more via checkboxes. */
  lockedCategoryIds?: string[]
  title?: string
  description?: string
}

/** Modal wrapper around FoodItemForm; closes on successful create and notifies parent to refetch lists. */
export function CreateFoodItemDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
  lockedCategoryIds,
  title = 'Create food item',
  description = 'Add a new food item with nutritional information.',
}: Readonly<CreateFoodItemDialogProps>) {
  const create = useCreateFoodItem()

  const handleSubmit = async (data: CreateFoodItem | UpdateFoodItem, options?: FoodItemFormSubmitOptions) => {
    await create.mutateAsync({ ...data, ...options } as CreateFoodItem & { file?: File })
    onOpenChange(false)
    onSuccess?.()
  }

  const formResetKey = foodItemFormResetKey(open, lockedCategoryIds)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <FoodItemForm
          key={formResetKey}
          categories={categories}
          lockedCategoryIds={lockedCategoryIds}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={create.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}

/** Remount `FoodItemForm` when the dialog opens or locked IDs change so defaults stay correct. */
function foodItemFormResetKey(open: boolean, lockedCategoryIds?: string[]): string {
  if (!open) return 'closed'
  return `open-${(lockedCategoryIds ?? []).join(',')}`
}
