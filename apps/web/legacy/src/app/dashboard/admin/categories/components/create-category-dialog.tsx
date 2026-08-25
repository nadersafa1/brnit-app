'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FoodCategoryForm } from './food-category-form'
import type { CreateFoodCategory } from '@/types/api/food.schemas'
import { useCreateFoodCategory } from '@/hooks/use-food-mutations'

interface CreateCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCategoryDialogProps) {
  const create = useCreateFoodCategory()

  const handleSubmit = async (data: CreateFoodCategory) => {
    await create.mutateAsync(data)
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create category</DialogTitle>
          <DialogDescription>Add a new food category.</DialogDescription>
        </DialogHeader>
        <FoodCategoryForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={create.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
