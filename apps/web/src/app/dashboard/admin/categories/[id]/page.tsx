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
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useFoodCategory } from '@/hooks/use-food-category'
import { useUpdateFoodCategory, useDeleteFoodCategory } from '@/hooks/use-food-mutations'
import { FoodCategoryForm } from '../components/food-category-form'
import type { UpdateFoodCategory } from '@/types/api/food.schemas'

export default function CategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const showDelete = searchParams.get('delete') === '1'

  const { data: category, isLoading, error, refetch } = useFoodCategory(id)
  const update = useUpdateFoodCategory()
  const deleteCat = useDeleteFoodCategory()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(showDelete)

  useEffect(() => {
    setDeleteOpen(showDelete)
  }, [showDelete])

  const handleUpdate = useCallback(
    async (data: UpdateFoodCategory) => {
      await update.mutateAsync({ id, ...data })
      setEditOpen(false)
      refetch()
    },
    [id, update, refetch]
  )

  const handleDeleteConfirm = useCallback(async () => {
    await deleteCat.mutateAsync(id)
    setDeleteOpen(false)
    router.push('/dashboard/admin/categories')
  }, [id, deleteCat, router])

  if (isLoading || !category) {
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
        <Link href='/dashboard/admin/categories'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to categories
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

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between gap-4'>
        <Link href='/dashboard/admin/categories'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to categories
          </Button>
        </Link>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setEditOpen(true)} className='gap-2'>
            <Pencil className='h-4 w-4' />
            Edit
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setDeleteOpen(true)}
            className='text-destructive hover:text-destructive gap-2'
          >
            <Trash2 className='h-4 w-4' />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className='text-lg font-semibold'>{category.name}</h2>
        </CardHeader>
        <CardContent className='space-y-2'>
          <p className='text-sm text-muted-foreground'>
            Created: {category.createdAt ? new Date(category.createdAt).toLocaleDateString() : '–'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Update the category name.</DialogDescription>
          </DialogHeader>
          <FoodCategoryForm
            category={category}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            isLoading={update.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{category.name}&quot;? This cannot be undone. Food items in this category must be moved or
              removed first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteCat.isPending}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              {deleteCat.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
