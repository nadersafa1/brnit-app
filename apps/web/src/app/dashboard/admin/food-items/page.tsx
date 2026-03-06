'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UtensilsCrossed, Plus } from 'lucide-react'
import { FoodItemsTable } from './components/food-items-table'
import { CreateFoodItemDialog } from './components/create-food-item-dialog'
import { useFoodItems } from '@/hooks/use-food-items'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodItem } from '@/lib/queries/food-items'

export default function FoodItemsPage() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  const [filters, setFilters] = useState<{
    page: number
    perPage: number
    q: string
    sortBy: 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    categoryId: string | undefined
  }>({
    page: 1,
    perPage: DEFAULT_PAGE_SIZE,
    q: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    categoryId: undefined,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const { data: items, pagination, isLoading, error, refetch } = useFoodItems(filters)
  const { data: categories } = useFoodCategories({
    page: 1,
    perPage: 100,
  })

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

  if (session?.user?.role !== 'admin') return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Food Items</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create food item
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
            <FoodItemsTable
              items={items}
              categories={categories}
              pagination={paginationConfig}
              onPageChange={(page) => setFilters((f) => ({ ...f, page }))}
              onPageSizeChange={(perPage) => setFilters((f) => ({ ...f, perPage, page: 1 }))}
              onSearchChange={(q) => setFilters((f) => ({ ...f, q, page: 1 }))}
              searchValue={filters.q}
              categoryId={filters.categoryId}
              onCategoryChange={(categoryId) => setFilters((f) => ({ ...f, categoryId, page: 1 }))}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSortingChange={(sortBy, sortOrder) =>
                setFilters((f) => ({
                  ...f,
                  sortBy: sortBy ?? 'createdAt',
                  sortOrder: sortOrder ?? 'desc',
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

      <CreateFoodItemDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={() => refetch()}
        categories={categories}
      />
    </div>
  )
}
