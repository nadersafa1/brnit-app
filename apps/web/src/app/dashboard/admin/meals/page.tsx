'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { MealsTable } from './components/meals-table'
import { CreateMealDialog } from './components/create-meal-dialog'
import { useMeals } from '@/hooks/use-meals'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { Meal } from '@/lib/queries/meals'

export default function MealsPage() {
  const router = useRouter()

  const [filters, setFilters] = useState<{
    page: number
    perPage: number
    q: string
    sortBy: 'name' | 'createdAt'
    sortOrder: 'asc' | 'desc'
  }>({
    page: 1,
    perPage: DEFAULT_PAGE_SIZE,
    q: '',
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: meals, pagination, isLoading, error, refetch } = useMeals(filters)

  const paginationConfig = pagination
    ? {
        page: pagination.page,
        limit: pagination.perPage,
        totalItems: pagination.totalItems,
        totalPages: pagination.totalPages,
      }
    : {
        page: filters.page,
        limit: filters.perPage,
        totalItems: 0,
        totalPages: 1,
      }

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
              pagination={paginationConfig}
              onPageChange={page => setFilters(f => ({ ...f, page }))}
              onPageSizeChange={perPage => setFilters(f => ({ ...f, perPage, page: 1 }))}
              onSearchChange={q => setFilters(f => ({ ...f, q, page: 1 }))}
              searchValue={filters.q}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortingChange={(sortBy, sortOrder) =>
                setFilters(f => ({
                  ...f,
                  sortBy: sortBy ?? 'name',
                  sortOrder: sortOrder ?? 'asc',
                  page: 1,
                }))
              }
              isLoading={isLoading}
              onRefetch={refetch}
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
