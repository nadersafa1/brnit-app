'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { Table, VisibilityState } from '@tanstack/react-table'
import { ChevronDown, Search, X } from 'lucide-react'
import * as React from 'react'
import { debounce } from '../utils/table-helpers'

export interface TableControlsProps<TData> {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchDebounceMs?: number
  table: Table<TData>
  getColumnLabel?: (columnId: string) => string
  /** Pass the same state that drives the table so column checkboxes stay in sync */
  columnVisibility?: VisibilityState
  filters?: React.ReactNode
  onResetFilters?: () => void
  showResetButton?: boolean
  /** When true, reset button is shown. When undefined, derived from searchValue (and filters node). */
  hasActiveFilters?: boolean
}

export function TableControls<TData>({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  searchDebounceMs = 300,
  table,
  getColumnLabel,
  columnVisibility,
  filters,
  onResetFilters,
  showResetButton = false,
  hasActiveFilters: hasActiveFiltersProp,
}: TableControlsProps<TData>) {
  const [localSearch, setLocalSearch] = React.useState(searchValue)
  const debouncedSearch = React.useMemo(
    () => (searchDebounceMs > 0 ? debounce(onSearchChange, searchDebounceMs) : onSearchChange),
    [onSearchChange, searchDebounceMs]
  )
  React.useEffect(() => setLocalSearch(searchValue), [searchValue])

  const handleSearchChange = (value: string) => {
    setLocalSearch(value)
    debouncedSearch(value)
  }

  const getLabel = (columnId: string) =>
    getColumnLabel?.(columnId) ??
    columnId
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, s => s.toUpperCase())
      .trim()

  const hasActiveFilters = hasActiveFiltersProp !== undefined ? hasActiveFiltersProp : Boolean(searchValue.trim())

  return (
    <div className='space-y-4'>
      <div className='flex flex-col md:flex-row gap-4'>
        <div className='relative w-full md:max-w-md'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none' />
          <Input
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={e => handleSearchChange(e.target.value)}
            className='pl-10 pr-10'
          />
          {localSearch && (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7'
              onClick={() => handleSearchChange('')}
              aria-label='Clear search'
            >
              <X className='h-4 w-4' />
            </Button>
          )}
        </div>
        <div className='flex gap-2 md:ml-auto'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' aria-label='Toggle columns'>
                Columns <ChevronDown className='ml-2 h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              {table
                .getAllColumns()
                .filter(c => c.getCanHide())
                .map(column => {
                  const isVisible = columnVisibility ? columnVisibility[column.id] !== false : column.getIsVisible()
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={isVisible}
                      onCheckedChange={v => column.toggleVisibility(!!v)}
                    >
                      {getLabel(column.id)}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {(filters || (hasActiveFilters && showResetButton && onResetFilters)) && (
        <div className='flex flex-col md:flex-row gap-4 sm:items-center'>
          {filters && <div className='flex flex-wrap gap-4'>{filters}</div>}
          {hasActiveFilters && showResetButton && onResetFilters && (
            <Button variant='ghost' size='sm' onClick={onResetFilters} className='md:ml-auto'>
              Reset filters <X className='ml-2 h-4 w-4' />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
