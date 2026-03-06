'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useFoodItem } from '@/hooks/use-food-item'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useUpdateFoodItem, useDeleteFoodItem } from '@/hooks/use-food-mutations'
import { FoodItemForm } from '../components/food-item-form'
import type { UpdateFoodItem } from '@/types/api/food.schemas'

export default function FoodItemDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const showDelete = searchParams.get('delete') === '1'

  const { data: session } = authClient.useSession()
  const { data: item, isLoading, error, refetch } = useFoodItem(id)
  const { data: categories } = useFoodCategories({ page: 1, perPage: 100 })
  const update = useUpdateFoodItem()
  const deleteItem = useDeleteFoodItem()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(showDelete)

  useEffect(() => {
    if (session === null || (session?.user && session.user.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [session, router])

  useEffect(() => {
    setDeleteOpen(showDelete)
  }, [showDelete])

  const handleUpdate = useCallback(
    async (data: UpdateFoodItem) => {
      await update.mutateAsync({ id, ...data })
      setEditOpen(false)
      refetch()
    },
    [id, update, refetch]
  )

  const handleDeleteConfirm = useCallback(async () => {
    await deleteItem.mutateAsync(id)
    setDeleteOpen(false)
    router.push('/dashboard/admin/food-items')
  }, [id, deleteItem, router])

  if (session?.user?.role !== 'admin') return null

  if (isLoading || !item) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/food-items">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to food items
          </Button>
        </Link>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/admin/food-items">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to food items
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-2">
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteOpen(true)}
            className="text-destructive hover:text-destructive gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">{item.name}</h2>
          <p className="text-sm text-muted-foreground">{item.categoryName ?? 'No category'}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Calories: {item.calories ?? '–'}</div>
            <div>Protein: {item.protein ?? '–'} g</div>
            <div>Carbs: {item.carbs ?? '–'} g</div>
            <div>Fat: {item.fat ?? '–'} g</div>
            {item.servingSize && <div>Serving size: {item.servingSize}</div>}
            {item.fdcId != null && <div>FDC ID: {item.fdcId}</div>}
          </div>
          <p className="text-sm text-muted-foreground pt-2">
            Created: {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '–'}
          </p>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit food item</DialogTitle>
            <DialogDescription>Update the food item details.</DialogDescription>
          </DialogHeader>
          <FoodItemForm
            item={item}
            categories={categories}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            isLoading={update.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete food item</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &quot;{item.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteItem.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteItem.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
