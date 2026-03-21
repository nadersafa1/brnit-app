'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { EntityListPageLayout } from '../../shared/entity-list-page-layout'
import { CategoriesTable } from '../../admin/categories/components/categories-table'
import { useFoodCategories } from '@/hooks/use-food-categories'
import { DEFAULT_PAGE_SIZE } from '@/lib/constants/pagination'
import type { FoodCategory } from '@/lib/queries/food-categories'
import { FolderTree } from 'lucide-react'

export default function NutritionistCategoriesPage() {
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

  const { data: categories, pagination, isLoading, error, refetch } = useFoodCategories(filters, 'nutritionist')

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
    (category: FoodCategory) => {
      router.push(`/dashboard/nutritionist/categories/${category.id}`)
    },
    [router]
  )

  const handleDelete = useCallback(() => {}, [])

  return (
    <EntityListPageLayout title='Food Categories' icon={FolderTree} error={error ?? null} onRetry={refetch}>
      <CategoriesTable
        categories={categories}
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
        readOnly
      />
    </EntityListPageLayout>
  )
}
