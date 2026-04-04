'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FolderTree, Plus } from 'lucide-react'
import { CategoriesTable } from './components/categories-table'
import { CreateCategoryDialog } from './components/create-category-dialog'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodCategory } from '@/lib/queries/food-categories'
import type { SortOrder } from '@/lib/table-core'
import type { CategoriesSortBy } from './components/categories-columns'

export default function CategoriesPage() {
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
    sortBy: 'name' as CategoriesSortBy,
    sortOrder: 'asc' as SortOrder,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: categories, pagination, isLoading, error, refetch } = useFoodCategories(filters)

  const handleEdit = useCallback(
    (category: FoodCategory) => {
      router.push(`/dashboard/admin/categories/${category.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (category: FoodCategory) => {
      router.push(`/dashboard/admin/categories/${category.id}?delete=1`)
    },
    [router]
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <FolderTree className='h-5 w-5 text-muted-foreground' />
          <h2 className='text-lg font-semibold'>Food Categories</h2>
        </div>
        <Button size='sm' variant='outline' onClick={() => setCreateOpen(true)} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create category
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
            <CategoriesTable
              categories={categories}
              paginationMeta={pagination}
              paginationFallback={paginationFallback}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onSearchChange={onSearchChange}
              searchValue={filters.q}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortingChange={(sortBy, sortOrder) =>
                updateFilters({ sortBy: sortBy ?? 'name', sortOrder: sortOrder ?? 'asc' })
              }
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}

      <CreateCategoryDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
