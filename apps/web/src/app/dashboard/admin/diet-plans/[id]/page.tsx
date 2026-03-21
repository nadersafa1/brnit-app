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
import { useDietPlan } from '@/hooks/use-diet-plan'
import { useUpdateDietPlan, useDeleteDietPlan } from '@/hooks/use-diet-plan-mutations'
import { AddDietPlanMealDialog, type DietPlanMealInput } from '../components/add-diet-plan-meal-dialog'
import { EditDietPlanMealDialog } from './components/edit-diet-plan-meal-dialog'
import { DietPlanForm } from '../components/diet-plan-form'
import { DietPlanMetadataCard } from './components/diet-plan-metadata-card'
import { DietPlanMealsTable } from './components/diet-plan-meals-table'
import type { DietPlanMeal } from '@/lib/queries/diet-plans'

export default function DietPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const showDelete = searchParams.get('delete') === '1'

  const { data: plan, isLoading, error, refetch } = useDietPlan(id)
  const updatePlan = useUpdateDietPlan()
  const deletePlan = useDeleteDietPlan()

  const [editOpen, setEditOpen] = useState(false)
  const [addMealOpen, setAddMealOpen] = useState(false)
  const [editSlotOpen, setEditSlotOpen] = useState(false)
  const [slotToEdit, setSlotToEdit] = useState<DietPlanMeal | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteOpen, setDeleteOpen] = useState(showDelete)

  useEffect(() => {
    setDeleteOpen(showDelete)
  }, [showDelete])

  const handleUpdateMetadata = useCallback(
    async (data: { name: string; description?: string }) => {
      await updatePlan.mutateAsync({
        id,
        name: data.name,
        description: data.description?.trim() ? data.description.trim() : null,
      })
      setEditOpen(false)
      refetch()
    },
    [id, updatePlan, refetch]
  )

  const handleAddMeal = useCallback(
    async (meal: DietPlanMealInput) => {
      await updatePlan.mutateAsync({
        id,
        add: [
          {
            mealId: meal.mealId,
            dayNumber: meal.dayNumber,
            mealType: meal.mealType,
            mealOrder: meal.mealOrder,
            scheduledTime: meal.scheduledTime,
          },
        ],
      })
      setAddMealOpen(false)
      refetch()
    },
    [id, updatePlan, refetch]
  )

  const handleEditMeal = useCallback((meal: DietPlanMeal) => {
    setSlotToEdit(meal)
    setEditSlotOpen(true)
  }, [])

  const handleUpdateMealSlot = useCallback(
    async (input: {
      dietPlanMealId: string
      mealId?: string
      dayNumber?: number
      mealType?: string
      mealOrder?: number
      scheduledTime?: string | null
    }) => {
      await updatePlan.mutateAsync({
        id,
        update: [input],
      })
      setEditSlotOpen(false)
      setSlotToEdit(null)
      refetch()
    },
    [id, updatePlan, refetch]
  )

  const handleRemoveMeal = useCallback(
    async (dietPlanMealId: string) => {
      await updatePlan.mutateAsync({ id, remove: [dietPlanMealId] })
      refetch()
    },
    [id, updatePlan, refetch]
  )

  const handleBulkRemoveMeals = useCallback(async () => {
    if (selectedIds.length === 0) return
    await updatePlan.mutateAsync({ id, remove: selectedIds })
    setSelectedIds([])
    refetch()
  }, [id, selectedIds, updatePlan, refetch])

  const handleDeletePlan = useCallback(async () => {
    await deletePlan.mutateAsync(id)
    setDeleteOpen(false)
    router.push('/dashboard/admin/diet-plans')
  }, [id, deletePlan, router])

  if (isLoading || !plan) {
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
        <Link href='/dashboard/admin/diet-plans'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to diet plans
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

  const meals = plan.dietPlanMeals ?? []

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <Link href='/dashboard/admin/diet-plans'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to diet plans
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditOpen(true)} className='gap-2'>
            <Pencil className='h-4 w-4' />
            Edit plan
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDeleteOpen(true)}
            className='text-destructive hover:text-destructive gap-2'
          >
            <Trash2 className='h-4 w-4' />
            Delete plan
          </Button>
        </div>
      </div>

      <DietPlanMetadataCard plan={plan} />

      <Card>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-4'>
          <h3 className='text-sm font-medium'>Meal slots in this plan</h3>
          <div className='flex gap-2'>
            <Button size='sm' variant='outline' onClick={() => setAddMealOpen(true)} className='gap-2'>
              <Plus className='h-4 w-4' />
              Add meal
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size='sm'
                variant='outline'
                onClick={handleBulkRemoveMeals}
                className='text-destructive hover:text-destructive gap-2'
                disabled={updatePlan.isPending}
              >
                Delete selected ({selectedIds.length})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <DietPlanMealsTable
            meals={meals}
            onEdit={handleEditMeal}
            onRemove={handleRemoveMeal}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            isRemoving={updatePlan.isPending}
          />
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit diet plan</DialogTitle>
            <DialogDescription>Update the plan name and description.</DialogDescription>
          </DialogHeader>
          <DietPlanForm
            defaultValues={{ name: plan.name, description: plan.description ?? '' }}
            onSubmit={handleUpdateMetadata}
            onCancel={() => setEditOpen(false)}
            isLoading={updatePlan.isPending}
            submitLabel='Save'
          />
        </DialogContent>
      </Dialog>

      <AddDietPlanMealDialog open={addMealOpen} onOpenChange={setAddMealOpen} onAdd={handleAddMeal} />

      <EditDietPlanMealDialog
        open={editSlotOpen}
        onOpenChange={setEditSlotOpen}
        slot={slotToEdit}
        onUpdate={handleUpdateMealSlot}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete diet plan</AlertDialogTitle>
            <AlertDialogDescription>Delete &quot;{plan.name}&quot;? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePlan}
              disabled={deletePlan.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deletePlan.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
