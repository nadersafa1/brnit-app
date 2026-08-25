'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { PaginationConfig } from '../types'
import { getPaginationRange, getVisiblePages } from '../utils/table-helpers'

export interface TablePaginationProps {
  pagination: PaginationConfig
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  showPageSizeSelector?: boolean
  showPageNumbers?: boolean
  maxVisiblePages?: number
}

export function TablePagination({
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeSelector = true,
  showPageNumbers = true,
  maxVisiblePages = 5,
}: Readonly<TablePaginationProps>) {
  const { page, totalPages, perPage } = pagination
  const canPrev = page > 1
  const canNext = page < totalPages
  const visiblePages = showPageNumbers ? getVisiblePages(page, totalPages, maxVisiblePages) : []
  const range = getPaginationRange(pagination)

  return (
    <div className='flex flex-col gap-4 px-2 py-4 sm:flex-row sm:items-center sm:justify-between'>
      {showPageSizeSelector && (
        <div className='flex items-center gap-2'>
          <p className='text-sm text-muted-foreground' id='rows-per-page-label'>
            Rows per page
          </p>
          <Select value={String(perPage)} onValueChange={v => onPageSizeChange(Number(v))}>
            <SelectTrigger className='h-8 w-[70px]' aria-labelledby='rows-per-page-label'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent side='top'>
              {pageSizeOptions.map(size => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className='flex items-center gap-4'>
        <p className='text-sm text-muted-foreground' role='status' aria-live='polite'>
          {range}
        </p>
        <nav className='flex items-center gap-1' aria-label='Pagination'>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
            aria-label='First page'
          >
            <ChevronsLeft className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => onPageChange(page - 1)}
            disabled={!canPrev}
            aria-label='Previous'
          >
            <ChevronLeft className='h-4 w-4' />
          </Button>
          {showPageNumbers &&
            visiblePages.map((p, i) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${i}-${p}`}
                  className='flex h-8 w-8 items-center justify-center text-sm text-muted-foreground'
                >
                  ...
                </span>
              ) : (
                <Button
                  key={p}
                  variant={page === p ? 'default' : 'outline'}
                  size='icon'
                  className='h-8 w-8'
                  onClick={() => onPageChange(p)}
                  aria-current={page === p ? 'page' : undefined}
                >
                  {p}
                </Button>
              )
            )}
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => onPageChange(page + 1)}
            disabled={!canNext}
            aria-label='Next'
          >
            <ChevronRight className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            size='icon'
            className='h-8 w-8'
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
            aria-label='Last page'
          >
            <ChevronsRight className='h-4 w-4' />
          </Button>
        </nav>
      </div>
    </div>
  )
}
