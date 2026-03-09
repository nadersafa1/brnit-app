'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FoodItemForm, type FoodItemFormSubmitOptions } from './food-item-form'
import type { CreateFoodItem, UpdateFoodItem } from '@/types/api/food.schemas'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { useCreateFoodItem } from '@/hooks/use-food-mutations'

interface CreateFoodItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  categories: FoodCategory[]
}

export function CreateFoodItemDialog({
  open,
  onOpenChange,
  onSuccess,
  categories,
}: CreateFoodItemDialogProps) {
  const create = useCreateFoodItem()

  const handleSubmit = async (
    data: CreateFoodItem | UpdateFoodItem,
    options?: FoodItemFormSubmitOptions
  ) => {
    await create.mutateAsync({ ...data, ...options } as CreateFoodItem & { file?: File })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create food item</DialogTitle>
          <DialogDescription>Add a new food item with nutritional information.</DialogDescription>
        </DialogHeader>
        <FoodItemForm
          key={open ? 'open' : 'closed'}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={create.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
