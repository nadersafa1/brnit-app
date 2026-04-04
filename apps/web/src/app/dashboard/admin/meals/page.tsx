'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { MealsTable } from './components/meals-table'
import { CreateMealDialog } from './components/create-meal-dialog'
import { useMeals } from '@/hooks/use-meals'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { Meal } from '@/lib/queries/meals'
import type { SortOrder } from '@/lib/table-core'
import type { MealsSortBy } from './components/meals-columns'

export default function MealsPage() {
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
    sortBy: 'name' as MealsSortBy,
    sortOrder: 'asc' as SortOrder,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: meals, pagination, isLoading, error, refetch } = useMeals(filters)

  const handleEdit = useCallback(
    (meal: Meal) => {
      router.push(`/dashboard/admin/meals/${meal.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (meal: Meal) => {
      router.push(`/dashboard/admin/meals/${meal.id}?delete=1`)
    },
    [router]
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <UtensilsCrossed className='h-5 w-5 text-muted-foreground' />
          <h2 className='text-lg font-semibold'>Meals</h2>
        </div>
        <Button size='sm' variant='outline' onClick={() => setCreateOpen(true)} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create meal
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
            <MealsTable
              meals={meals}
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

      <CreateMealDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => refetch()} />
    </div>
  )
}
