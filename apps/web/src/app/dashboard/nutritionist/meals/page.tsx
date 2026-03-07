'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useOrganizationContext } from '@/hooks/authorization/use-organization-context'
import { canAccessNutritionistFeatures } from '@/lib/authorization/nutritionist-access'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { MealsTable } from '../../admin/meals/components/meals-table'
import { CreateMealDialog } from '../../admin/meals/components/create-meal-dialog'
import { useMeals } from '@/hooks/use-meals'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { Meal } from '@/lib/queries/meals'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NutritionistMealsPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { context } = useOrganizationContext()

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

  const { data: meals, pagination, isLoading, error, refetch } = useMeals(
    filters,
    'nutritionist'
  )

  useEffect(() => {
    if (
      session === null ||
      !canAccessNutritionistFeatures(session, context)
    ) {
      router.replace('/dashboard')
    }
  }, [session, context, router])

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

  if (!canAccessNutritionistFeatures(session ?? null, context)) return null

  return (
    <>
      <EntityListPageLayout
        title="Meals"
        icon={UtensilsCrossed}
        createButton={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCreateOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create meal
          </Button>
        }
        error={error ?? null}
        onRetry={refetch}
      >
        <MealsTable
          meals={meals}
          pagination={paginationConfig}
          onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
          onPageSizeChange={(perPage) =>
            setFilters((f) => ({ ...f, perPage, page: 1 }))
          }
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
      </EntityListPageLayout>

      <CreateMealDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
        source="nutritionist"
      />
    </>
  )
}
