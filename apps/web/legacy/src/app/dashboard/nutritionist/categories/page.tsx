'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { CategoriesTable } from '../../admin/categories/components/categories-table'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { useListFilters } from '@/hooks/use-list-filters'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodCategory } from '@/lib/queries/food-categories'
import type { SortOrder } from '@/lib/table-core'
import type { CategoriesSortBy } from '../../admin/categories/components/categories-columns'
import { FolderTree } from 'lucide-react'

const noop = () => {}

export default function NutritionistCategoriesPage() {
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
    sortBy: 'name' as CategoriesSortBy,
    sortOrder: 'asc' as SortOrder,
  })

  const { data: categories, pagination, isLoading, error, refetch } = useFoodCategories(filters, 'nutritionist')

  const handleEdit = useCallback(
    (category: FoodCategory) => {
      router.push(`/dashboard/nutritionist/categories/${category.id}`)
    },
    [router]
  )

  return (
    <EntityListPageLayout title='Food Categories' icon={FolderTree} error={error ?? null} onRetry={refetch}>
      <CategoriesTable
        categories={categories}
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
        onDelete={noop}
        readOnly
      />
    </EntityListPageLayout>
  )
}
