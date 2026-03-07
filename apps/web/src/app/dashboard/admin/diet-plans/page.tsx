'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Plus } from 'lucide-react'
import { DietPlansTable } from './components/diet-plans-table'
import { CreateDietPlanDialog } from './components/create-diet-plan-dialog'
import { useDietPlans } from '@/hooks/use-diet-plans'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { DietPlan } from '@/lib/queries/diet-plans'

export default function DietPlansPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

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

  const { data: plans, pagination, isLoading, error, refetch } = useDietPlans(filters)

  useEffect(() => {
    if (session === null || (session?.user && session.user.role !== 'admin')) {
      router.replace('/dashboard')
    }
  }, [session, router])

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

  if (session?.user?.role !== 'admin') return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Diet plans</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create diet plan
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <Card>
          <CardContent className="pt-6">
            <DietPlansTable
              plans={plans}
              pagination={paginationConfig}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              onPageSizeChange={(perPage) => setFilters((f) => ({ ...f, perPage, page: 1 }))}
              onSearchChange={(q) => setFilters((f) => ({ ...f, q, page: 1 }))}
              searchValue={filters.q}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortingChange={(sortBy, sortOrder) =>
                setFilters((f) => ({
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

      <CreateDietPlanDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
      />
    </div>
  )
}
