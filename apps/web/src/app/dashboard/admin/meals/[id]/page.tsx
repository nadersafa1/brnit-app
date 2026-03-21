'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react'
import { useMeal } from '@/hooks/use-meal'
import { useUpdateMeal, useDeleteMeal } from '@/hooks/use-meal-mutations'
import { MealMetadataCard } from './components/meal-metadata-card'
import { MealSummaryCard } from './components/meal-summary-card'
import { MealItemsTable } from './components/meal-items-table'
import { AddFoodDialog } from './components/add-food-dialog'
import { BulkSetQuantityDialog } from './components/bulk-set-quantity-dialog'
import { MealForm } from '../components/meal-form'

export default function MealDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const showDelete = searchParams.get('delete') === '1'

  const { data: meal, isLoading, error, refetch } = useMeal(id)
  const updateMeal = useUpdateMeal()
  const deleteMeal = useDeleteMeal()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(showDelete)
  const [addFoodOpen, setAddFoodOpen] = useState(false)
  const [bulkQuantityOpen, setBulkQuantityOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  useEffect(() => {
    setDeleteOpen(showDelete)
  }, [showDelete])

  const handleUpdateMetadata = useCallback(
    async (data: { name: string; description?: string }) => {
      await updateMeal.mutateAsync({
        id,
        name: data.name,
        description: data.description?.trim() ? data.description.trim() : null,
      })
      setEditOpen(false)
      refetch()
    },
    [id, updateMeal, refetch]
  )

  const handleDeleteMeal = useCallback(async () => {
    await deleteMeal.mutateAsync(id)
    setDeleteOpen(false)
    router.push('/dashboard/admin/meals')
  }, [id, deleteMeal, router])

  const handleAddFood = useCallback(
    async (foodItemId: string, quantity: number) => {
      await updateMeal.mutateAsync({ id, add: [{ foodItemId, quantity }] })
      refetch()
    },
    [id, updateMeal, refetch]
  )

  const handleQuantityChange = useCallback(
    async (mealItemId: string, quantity: number) => {
      await updateMeal.mutateAsync({ id, update: [{ mealItemId, quantity }] })
      refetch()
    },
    [id, updateMeal, refetch]
  )

  const handleRemove = useCallback(
    async (mealItemId: string) => {
      await updateMeal.mutateAsync({ id, remove: [mealItemId] })
      refetch()
    },
    [id, updateMeal, refetch]
  )

  const handleBulkRemove = useCallback(async () => {
    if (selectedIds.length === 0) return
    await updateMeal.mutateAsync({ id, remove: selectedIds })
    setSelectedIds([])
    refetch()
  }, [id, selectedIds, updateMeal, refetch])

  const handleBulkSetQuantity = useCallback(
    async (quantity: number) => {
      if (selectedIds.length === 0) return
      await updateMeal.mutateAsync({
        id,
        update: selectedIds.map(mealItemId => ({ mealItemId, quantity })),
      })
      setSelectedIds([])
      refetch()
    },
    [id, selectedIds, updateMeal, refetch]
  )

  if (isLoading || !meal) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-32' />
        <Skeleton className='h-32' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='space-y-4'>
        <Link href='/dashboard/admin/meals'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to meals
          </Button>
        </Link>
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <p className='text-destructive'>{error}</p>
            <Button variant='outline' size='sm' className='mt-2' onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const mealItems = meal.mealItems ?? []

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <Link href='/dashboard/admin/meals'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to meals
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditOpen(true)} className='gap-2'>
            <Pencil className='h-4 w-4' />
            Edit meal
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDeleteOpen(true)}
            className='text-destructive hover:text-destructive gap-2'
          >
            <Trash2 className='h-4 w-4' />
            Delete meal
          </Button>
        </div>
      </div>

      <MealMetadataCard meal={meal} />

      <MealSummaryCard mealItems={mealItems} />

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <h3 className='text-sm font-medium'>Food items in this meal</h3>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => setAddFoodOpen(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              Add food
            </Button>
            {selectedIds.length > 0 && (
              <>
                <Button size='sm' variant='outline' onClick={() => setBulkQuantityOpen(true)} className='gap-2'>
                  Bulk set quantity
                </Button>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={handleBulkRemove}
                  className='text-destructive hover:text-destructive gap-2'
                  disabled={updateMeal.isPending}
                >
                  Delete selected ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MealItemsTable
            mealItems={mealItems}
            onQuantityChange={handleQuantityChange}
            onRemove={handleRemove}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
          />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit meal</DialogTitle>
            <DialogDescription>Update the meal name and description.</DialogDescription>
          </DialogHeader>
          <MealForm
            defaultValues={{ name: meal.name, description: meal.description ?? '' }}
            onSubmit={handleUpdateMetadata}
            onCancel={() => setEditOpen(false)}
            isLoading={updateMeal.isPending}
          />
        </DialogContent>
      </Dialog>

      <AddFoodDialog
        open={addFoodOpen}
        onOpenChange={setAddFoodOpen}
        onAdd={handleAddFood}
        excludeFoodIds={mealItems.map(mi => mi.foodItemId)}
      />

      <BulkSetQuantityDialog
        open={bulkQuantityOpen}
        onOpenChange={setBulkQuantityOpen}
        selectedCount={selectedIds.length}
        onConfirm={handleBulkSetQuantity}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meal</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{meal.name}&quot;? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMeal}
              disabled={deleteMeal.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteMeal.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
