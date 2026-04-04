'use client'

import { useCallback, useState } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { MealsTable } from '../../admin/meals/components/meals-table'
import { CreateMealDialog } from '../../admin/meals/components/create-meal-dialog'
import { useMealsListTableActions } from '@/hooks/use-meals-list-table-actions'
import { useMeals } from '@/hooks/use-meals'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { SortOrder } from '@/lib/table-core'
import type { MealsSortBy } from '../../admin/meals/components/meals-columns'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NutritionistMealsPage() {
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

  const { data: meals, pagination, isLoading, error, invalidateList } = useMeals(filters, 'nutritionist')
  const { handleEdit, handleDelete, handleClone } = useMealsListTableActions('nutritionist')

  const handleSortingChange = useCallback(
    (nextSortBy?: MealsSortBy, nextOrder?: 'asc' | 'desc') => {
      updateFilters({ sortBy: nextSortBy ?? 'name', sortOrder: nextOrder ?? 'asc' })
    },
    [updateFilters]
  )

  const retryList = useCallback(() => void invalidateList(), [invalidateList])

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
        onRetry={retryList}
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
          onSortingChange={handleSortingChange}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClone={handleClone}
        />
      </EntityListPageLayout>

      <CreateMealDialog open={createOpen} onOpenChange={setCreateOpen} source='nutritionist' />
    </>
  )
}
