'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { FoodItemsTable } from '../../admin/food-items/components/food-items-table'
import { useFoodItems } from '@/hooks/use-food-items'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodItem } from '@/lib/queries/food-items'
import type { SortOrder } from '@/lib/table-core'
import type { FoodItemsSortBy } from '../../admin/food-items/components/food-items-columns'
import { UtensilsCrossed } from 'lucide-react'

const noop = () => {}

export default function NutritionistFoodItemsPage() {
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
    sortBy: 'createdAt' as FoodItemsSortBy,
    sortOrder: 'desc' as SortOrder,
    categoryId: undefined as string | undefined,
  })

  const { data: items, pagination, isLoading, error, refetch } = useFoodItems(filters, 'nutritionist')
  const { data: categories } = useFoodCategories({ page: 1, perPage: 100 }, 'nutritionist')

  const handleEdit = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/nutritionist/food-items/${item.id}`)
    },
    [router]
  )

  return (
    <EntityListPageLayout title='Food Items' icon={UtensilsCrossed} error={error ?? null} onRetry={refetch}>
      <FoodItemsTable
        items={items}
        categories={categories}
        paginationMeta={pagination}
        paginationFallback={paginationFallback}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onSearchChange={onSearchChange}
        searchValue={filters.q}
        categoryId={filters.categoryId}
        onCategoryChange={categoryId => updateFilters({ categoryId })}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortingChange={(sortBy, sortOrder) =>
          updateFilters({ sortBy: sortBy ?? 'createdAt', sortOrder: sortOrder ?? 'desc' })
        }
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={noop}
        readOnly
      />
    </EntityListPageLayout>
  )
}
