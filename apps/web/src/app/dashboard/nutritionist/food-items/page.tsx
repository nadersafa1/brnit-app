'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { FoodItemsTable } from '../../admin/food-items/components/food-items-table'
import { useFoodItems } from '@/hooks/use-food-items'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodItem } from '@/lib/queries/food-items'
import { UtensilsCrossed } from 'lucide-react'

export default function NutritionistFoodItemsPage() {
  const router = useRouter()

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

  const { data: items, pagination, isLoading, error, refetch } = useFoodItems(filters, 'nutritionist')
  const { data: categories } = useFoodCategories({ page: 1, perPage: 100 }, 'nutritionist')

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
      router.push(`/dashboard/nutritionist/food-items/${item.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(() => {}, [])

  return (
    <EntityListPageLayout title='Food Items' icon={UtensilsCrossed} error={error ?? null} onRetry={refetch}>
      <FoodItemsTable
        items={items}
        categories={categories}
        pagination={paginationConfig}
        onPageChange={page => setFilters(f => ({ ...f, page }))}
        onPageSizeChange={perPage => setFilters(f => ({ ...f, perPage, page: 1 }))}
        onSearchChange={q => setFilters(f => ({ ...f, q, page: 1 }))}
        searchValue={filters.q}
        categoryId={filters.categoryId}
        onCategoryChange={categoryId => setFilters(f => ({ ...f, categoryId, page: 1 }))}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortingChange={(sortBy, sortOrder) =>
          setFilters(f => ({
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
        readOnly
      />
    </EntityListPageLayout>
  )
}
