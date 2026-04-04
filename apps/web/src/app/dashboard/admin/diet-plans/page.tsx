'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Plus } from 'lucide-react'
import { DietPlansTable } from './components/diet-plans-table'
import { CreateDietPlanDialog } from './components/create-diet-plan-dialog'
import { useDietPlans } from '@/hooks/use-diet-plans'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { DietPlan } from '@/lib/queries/diet-plans'
import type { SortOrder } from '@/lib/table-core'
import type { DietPlansSortBy } from './components/diet-plans-columns'

export default function DietPlansPage() {
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
    sortBy: 'name' as DietPlansSortBy,
    sortOrder: 'asc' as SortOrder,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: plans, pagination, isLoading, error, refetch } = useDietPlans(filters)

  const handleEdit = useCallback(
    (plan: DietPlan) => {
      router.push(`/dashboard/admin/diet-plans/${plan.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(
    (plan: DietPlan) => {
      router.push(`/dashboard/admin/diet-plans/${plan.id}?delete=1`)
    },
    [router]
  )

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div className='flex items-center gap-2'>
          <ClipboardList className='h-5 w-5 text-muted-foreground' />
          <h2 className='text-lg font-semibold'>Diet plans</h2>
        </div>
        <Button size='sm' variant='outline' onClick={() => setCreateOpen(true)} className='gap-2'>
          <Plus className='h-4 w-4' />
          Create diet plan
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
            <DietPlansTable
              plans={plans}
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

      <CreateDietPlanDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
