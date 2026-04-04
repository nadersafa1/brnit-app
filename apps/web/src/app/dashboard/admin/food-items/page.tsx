'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { FoodItemsTable } from './components/food-items-table'
import { CreateFoodItemDialog } from './components/create-food-item-dialog'
import { useFoodItems } from '@/hooks/use-food-items'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodItem } from '@/lib/queries/food-items'
import type { SortOrder } from '@/lib/table-core'
import type { FoodItemsSortBy } from './components/food-items-columns'

export default function FoodItemsPage() {
  const router = useRouter()

  const {
    filters,
    paginationFallback,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    updateFilters,
  } = useListFilters({
    page: 1,
    perPage: DEFAULT_PAGE_SIZE,
    q: '',
    sortBy: 'createdAt' as FoodItemsSortBy,
    sortOrder: 'desc' as SortOrder,
    categoryId: undefined as string | undefined,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: items, pagination, isLoading, error, refetch } = useFoodItems(filters)
  const { data: categories } = useFoodCategories({ page: 1, perPage: 100 })

  const handleEdit = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/admin/food-items/${item.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/admin/food-items/${item.id}?delete=1`)
    },
    [router]
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <UtensilsCrossed className='h-5 w-5 text-muted-foreground' />
          <h2 className='text-lg font-semibold'>Food Items</h2>
        </div>
        <Button size='sm' variant='outline' onClick={() => setCreateOpen(true)} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create food item
        </Button>
      </div>

      {error && (
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <p className='text-destructive'>{error}</p>
            <Button variant='outline' size='sm' className='mt-2' onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className='pt-6'>
            <FoodItemsTable
              items={items}
              categories={categories}
              paginationMeta={pagination}
              paginationFallback={paginationFallback}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onSearchChange={onSearchChange}
              searchValue={filters.q}
              categoryId={filters.categoryId}
              onCategoryChange={categoryId => updateFilters({ categoryId })}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortingChange={(sortBy, sortOrder) =>
                updateFilters({ sortBy: sortBy ?? 'createdAt', sortOrder: sortOrder ?? 'desc' })
              }
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}

      <CreateFoodItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
        categories={categories}
      />
    </div>
  )
}
