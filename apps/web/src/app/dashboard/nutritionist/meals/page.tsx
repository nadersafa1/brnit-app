'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { MealsTable } from '../../admin/meals/components/meals-table'
import { CreateMealDialog } from '../../admin/meals/components/create-meal-dialog'
import { useMeals } from '@/hooks/use-meals'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { Meal } from '@/lib/queries/meals'
import type { SortOrder } from '@/lib/table-core'
import type { MealsSortBy } from '../../admin/meals/components/meals-columns'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NutritionistMealsPage() {
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

  const { data: meals, pagination, isLoading, error, refetch } = useMeals(filters, 'nutritionist')

  const handleEdit = useCallback(
    (meal: Meal) => {
      router.push(`/dashboard/nutritionist/meals/${meal.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (meal: Meal) => {
      router.push(`/dashboard/nutritionist/meals/${meal.id}?delete=1`)
    },
    [router]
  )

  return (
    <>
      <EntityListPageLayout
        title='Meals'
        icon={UtensilsCrossed}
        createButton={
          <Button size='sm' variant='outline' onClick={() => setCreateOpen(true)} className='gap-2'>
            <Plus className='h-4 w-4' />
            Create meal
          </Button>
        }
        error={error ?? null}
        onRetry={refetch}
      >
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
      </EntityListPageLayout>

      <CreateMealDialog open={createOpen} onOpenChange={setCreateOpen} source='nutritionist' />
    </>
  )
}
