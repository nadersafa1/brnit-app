'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { CategoryDetailSummaryCard } from '@/components/category-detail-summary-card'
import { CategoryFoodItemsTableCard } from '@/components/category-food-items-table-card'
import { AdminCategoryAddFoodItemAction } from '../components/admin-category-add-food-item-action'
import { FoodItemsTable } from '../../food-items/components/food-items-table'
import { FoodCategoryForm } from '../components/food-category-form'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useFoodCategory } from '@/hooks/use-food-category'
import { useFoodItemsForCategory } from '@/hooks/use-food-items-for-category'
import { useUpdateFoodCategory, useDeleteFoodCategory } from '@/hooks/use-food-mutations'
import { useSyncBooleanFromUrlFlag } from '@/hooks/use-sync-boolean-from-url-flag'
import type { FoodItem } from '@/lib/queries/food-items'
import type { UpdateFoodCategory } from '@/types/api/food.schemas'

export default function CategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = params.id as string
  const showDelete = searchParams.get('delete') === '1'

  const { data: category, isLoading, error, refetch } = useFoodCategory(id)
  const { data: foodCategories } = useFoodCategories({ page: 1, perPage: 100 })
  const update = useUpdateFoodCategory()
  const deleteCat = useDeleteFoodCategory()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(showDelete)

  useSyncBooleanFromUrlFlag(showDelete, setDeleteOpen)

  const {
    filters: itemFilters,
    items: foodItems,
    isLoading: itemsLoading,
    error: itemsError,
    paginationMeta: itemsPaginationMeta,
    paginationFallback: itemsPaginationFallback,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSortingChange,
  } = useFoodItemsForCategory(id, 'admin')

  const handleFoodItemEdit = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/admin/food-items/${item.id}`)
    },
    [router]
  )

  const handleFoodItemDelete = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/admin/food-items/${item.id}?delete=1`)
    },
    [router]
  )

  const handleUpdate = useCallback(
    async (data: UpdateFoodCategory) => {
      await update.mutateAsync({ id, ...data })
      setEditOpen(false)
    },
    [id, update]
  )

  const handleDeleteConfirm = useCallback(async () => {
    await deleteCat.mutateAsync(id)
    setDeleteOpen(false)
    router.push('/dashboard/admin/categories')
  }, [id, deleteCat, router])

  // Category query still loading or no row yet (navigation edge).
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
      {/* Top bar: navigation + category CRUD */}
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

      <CategoryDetailSummaryCard
        name={category.name}
        description={category.description}
        createdAt={category.createdAt}
      />

      {/* Items in this category: table + add flow (locked to this category in the dialog) */}
      <CategoryFoodItemsTableCard
        error={itemsError}
        headerAction={
          <AdminCategoryAddFoodItemAction
            categoryId={id}
            categoryName={category.name}
            categories={foodCategories}
          />
        }
      >
        <FoodItemsTable
          items={foodItems}
          categories={[]}
          paginationMeta={itemsPaginationMeta}
          paginationFallback={itemsPaginationFallback}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSearchChange={onSearchChange}
          searchValue={itemFilters.q ?? ''}
          categoryId={id}
          hideCategoryFilter
          sortBy={itemFilters.sortBy}
          sortOrder={itemFilters.sortOrder}
          onSortingChange={onSortingChange}
          isLoading={itemsLoading}
          onEdit={handleFoodItemEdit}
          onDelete={handleFoodItemDelete}
        />
      </CategoryFoodItemsTableCard>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit category</DialogTitle>
            <DialogDescription>Update the category name and description.</DialogDescription>
          </DialogHeader>
          <FoodCategoryForm
            key={category.id}
            category={category}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            isLoading={update.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Destructive action; can be deep-linked via ?delete=1 (see useSyncBooleanFromUrlFlag). */}
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
