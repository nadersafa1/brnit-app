'use client'

import { useParams, useRouter } from 'next/navigation'
import { useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { CategoryDetailSummaryCard } from '@/components/category-detail-summary-card'
import { CategoryFoodItemsTableCard } from '@/components/category-food-items-table-card'
import { FoodItemsTable } from '@/app/dashboard/admin/food-items/components/food-items-table'
import { useFoodCategory } from '@/hooks/use-food-category'
import { useFoodItemsForCategory } from '@/hooks/use-food-items-for-category'
import type { FoodItem } from '@/lib/queries/food-items'
import { ArrowLeft } from 'lucide-react'

const noop = () => {}

export default function NutritionistCategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const { data: category, isLoading, error, refetch } = useFoodCategory(id, 'nutritionist')

  const {
    filters: itemFilters,
    items: foodItems,
    isLoading: itemsLoading,
    error: itemsError,
    paginationMeta: itemsPaginationMeta,
    paginationFallback: itemsPaginationFallback,
    onPageChange,
    onPageSizeChange,
    onSearchChange,
    onSortingChange,
  } = useFoodItemsForCategory(id, 'nutritionist')

  const handleFoodItemEdit = useCallback(
    (item: FoodItem) => {
      router.push(`/dashboard/nutritionist/food-items/${item.id}`)
    },
    [router]
  )

  if (isLoading || !category) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-32' />
        <Skeleton className='h-32' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='space-y-4'>
        <Link href='/dashboard/nutritionist/categories'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='h-4 w-4' />
            Back to categories
          </Button>
        </Link>
        <Card className='border-destructive'>
          <CardContent className='pt-6'>
            <p className='text-destructive'>{error}</p>
            <Button variant='outline' size='sm' className='mt-2' onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <Link href='/dashboard/nutritionist/categories'>
        <Button variant='ghost' size='sm' className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Back to categories
        </Button>
      </Link>

      <CategoryDetailSummaryCard
        name={category.name}
        description={category.description}
        createdAt={category.createdAt}
      />

      <CategoryFoodItemsTableCard error={itemsError}>
        <FoodItemsTable
          items={foodItems}
          categories={[]}
          paginationMeta={itemsPaginationMeta}
          paginationFallback={itemsPaginationFallback}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          onSearchChange={onSearchChange}
          searchValue={itemFilters.q ?? ''}
          categoryId={id}
          hideCategoryFilter
          sortBy={itemFilters.sortBy}
          sortOrder={itemFilters.sortOrder}
          onSortingChange={onSortingChange}
          isLoading={itemsLoading}
          onEdit={handleFoodItemEdit}
          onDelete={noop}
          readOnly
        />
      </CategoryFoodItemsTableCard>
    </div>
  )
}
