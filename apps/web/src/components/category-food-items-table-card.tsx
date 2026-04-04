import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/**
 * Category detail: title + optional header action (e.g. add item), error strip, then the table.
 * Shared by admin and nutritionist category views.
 */
export function CategoryFoodItemsTableCard({
  error,
  headerAction,
  children,
}: Readonly<{
  error: string | null
  /** e.g. “Add food item” on admin category detail */
  headerAction?: ReactNode
  children: ReactNode
}>) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2 space-y-0'>
        <CardTitle className='text-base font-semibold'>Food items in this category</CardTitle>
        {headerAction}
      </CardHeader>
      <CardContent className='pt-0'>
        {error ? <p className='text-sm text-destructive mb-4'>{error}</p> : null}
        {children}
      </CardContent>
    </Card>
  )
}
