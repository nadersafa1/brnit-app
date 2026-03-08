'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Loader2, X, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCombobox } from '@/hooks/use-combobox'
import type { UseComboboxOptions } from '@/hooks/use-combobox'

export interface BaseComboboxProps<T extends { id: string }>
  extends Omit<UseComboboxOptions<T>, 'onValueChange'> {
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string | ((searchQuery: string) => string)
  disabled?: boolean
  className?: string
  formatLabel: (item: T) => string | React.ReactNode
  formatSelectedLabel?: (item: T) => string | React.ReactNode
  onChange?: (value: string | null | string[]) => void
  onValueChange?: (value: string | null | string[]) => void
  allowClear?: boolean
  excludedIds?: string[]
  filterItem?: (item: T) => boolean
  'aria-label'?: string
  onCreateNew?: () => void
  createNewLabel?: string
  renderSelectedItems?: (items: T[]) => React.ReactNode
}

export function BaseCombobox<T extends { id: string }>({
  placeholder = 'Select item...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found.',
  disabled = false,
  className,
  formatLabel,
  formatSelectedLabel,
  allowClear = true,
  excludedIds = [],
  filterItem,
  'aria-label': ariaLabel,
  onCreateNew,
  createNewLabel = 'Create new',
  renderSelectedItems,
  onChange,
  onValueChange,
  ...comboboxOptions
}: BaseComboboxProps<T>) {
  const {
    items,
    selectedItem,
    selectedItems,
    isLoading,
    error,
    searchQuery,
    isOpen,
    hasMore,
    mode,
    setSearchQuery,
    setIsOpen,
    selectItem,
    toggleItem,
    removeItem,
    clearSelection,
    loadMore,
    retry,
  } = useCombobox<T>({
    ...comboboxOptions,
    onValueChange: onChange || onValueChange,
  })

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const currentValue = comboboxOptions.value
      if (mode === 'single' && item.id === currentValue) return true
      if (mode === 'multi' && Array.isArray(currentValue) && currentValue.includes(item.id)) return true
      if (excludedIds.includes(item.id)) return false
      if (filterItem && !filterItem(item)) return false
      return true
    })
  }, [items, excludedIds, filterItem, comboboxOptions.value, mode])

  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      clearSelection()
    },
    [clearSelection]
  )

  const handleSelect = React.useCallback(
    (item: T) => {
      if (mode === 'single') {
        selectItem(item)
        setIsOpen(false)
      } else {
        toggleItem(item)
      }
    },
    [mode, selectItem, toggleItem, setIsOpen]
  )

  const getEmptyMessage = () => {
    if (typeof emptyMessage === 'function') return emptyMessage(searchQuery)
    return searchQuery ? emptyMessage : 'Start typing to search...'
  }

  const selectedLabel =
    mode === 'single'
      ? selectedItem
        ? (formatSelectedLabel ? formatSelectedLabel(selectedItem) : formatLabel(selectedItem))
        : placeholder
      : selectedItems.length > 0
        ? `${selectedItems.length} item${selectedItems.length > 1 ? 's' : ''} selected`
        : placeholder

  const renderCommandContent = () => (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={searchPlaceholder}
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList className="max-h-[300px]">
        {error && (
          <div className="flex flex-col items-center justify-center py-6 px-4 gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <p className="text-destructive text-center text-sm">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Try Again
            </Button>
          </div>
        )}
        {isLoading && !error && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="ml-2 text-muted-foreground text-sm">Searching...</span>
          </div>
        )}
        {!isLoading && !error && (
          <>
            {filteredItems.length > 0 && (
              <CommandGroup>
                {filteredItems.map((item) => {
                  const isSelected =
                    mode === 'single'
                      ? comboboxOptions.value === item.id
                      : Array.isArray(comboboxOptions.value) && comboboxOptions.value.includes(item.id)
                  return (
                    <CommandItem
                      key={item.id}
                      value={item.id}
                      onSelect={() => handleSelect(item)}
                    >
                      <Check
                        className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')}
                      />
                      {formatLabel(item)}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
            {hasMore && filteredItems.length > 0 && (
              <div className="flex justify-center py-2 border-t">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
            {filteredItems.length === 0 && (
              <CommandEmpty>
                <div className="flex flex-col items-center justify-center py-6 px-4 gap-2">
                  <p className="text-muted-foreground text-center text-sm">{getEmptyMessage()}</p>
                  {onCreateNew && searchQuery && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onCreateNew()
                        setIsOpen(false)
                      }}
                    >
                      {createNewLabel}
                    </Button>
                  )}
                </div>
              </CommandEmpty>
            )}
          </>
        )}
      </CommandList>
    </Command>
  )

  const triggerButton = (
    <Button
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={isOpen}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn('w-full justify-between', mode === 'multi' && 'h-auto')}
      onClick={() => setIsOpen(!isOpen)}
    >
      <span className="truncate">{selectedLabel}</span>
      <div className="flex items-center gap-1 ml-2">
        {mode === 'single' && selectedItem && allowClear && !disabled && (
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={handleClear}
          />
        )}
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
      </div>
    </Button>
  )

  return (
    <div className={className}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          {renderCommandContent()}
        </PopoverContent>
      </Popover>

      {mode === 'multi' && selectedItems.length > 0 && (
        renderSelectedItems ? (
          renderSelectedItems(selectedItems)
        ) : (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedItems.map((item) => (
              <Badge key={item.id} variant="secondary" className="pr-1">
                {typeof formatLabel(item) === 'string' ? formatLabel(item) : item.id}
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="ml-1 rounded-full hover:bg-destructive/20 p-0.5"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )
      )}
    </div>
  )
}
