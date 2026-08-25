'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useCreateMeal } from '@/hooks/use-meal-mutations'
import type { DataSource } from '@/lib/queries/keys'
import { MealForm } from './meal-form'

interface CreateMealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  source?: DataSource
}

export function CreateMealDialog({
  open,
  onOpenChange,
  onSuccess,
  source = 'admin',
}: CreateMealDialogProps) {
  const create = useCreateMeal(source)

  const handleSubmit = async (data: { name: string; description?: string }) => {
    await create.mutateAsync({ ...data, mealItems: [] })
    onOpenChange(false)
    onSuccess?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create meal</DialogTitle>
          <DialogDescription>Add a new meal. You can add food items after creation.</DialogDescription>
        </DialogHeader>
        <MealForm
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          isLoading={create.isPending}
        />
      </DialogContent>
    </Dialog>
  )
}
