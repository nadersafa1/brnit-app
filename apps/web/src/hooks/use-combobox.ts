'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface CacheEntry<T> {
  items: T[]
  hasMore: boolean
  timestamp: number
}

const globalCache = new Map<string, CacheEntry<{ id: string }>>()

export interface UseComboboxOptions<T extends { id: string }> {
  fetchItems: (
    query: string,
    page: number,
    limit: number,
    signal?: AbortSignal
  ) => Promise<{ items: T[]; hasMore: boolean }>
  fetchItem?: (id: string) => Promise<T>
  value?: string | string[]
  onValueChange?: (value: string | null | string[]) => void
  mode?: 'single' | 'multi'
  maxSelections?: number
  debounceMs?: number
  itemsPerPage?: number
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  cacheTTL?: number
  cacheKey?: string
  enableCache?: boolean
}

export interface UseComboboxReturn<T extends { id: string }> {
  items: T[]
  selectedItem: T | null
  selectedItems: T[]
  searchQuery: string
  isLoading: boolean
  error: string | null
  isOpen: boolean
  hasMore: boolean
  page: number
  mode: 'single' | 'multi'
  setSearchQuery: (query: string) => void
  setIsOpen: (open: boolean) => void
  selectItem: (item: T | null) => void
  toggleItem: (item: T) => void
  removeItem: (itemId: string) => void
  clearSelection: () => void
  loadMore: () => void
  retry: () => void
  clearCache: () => void
  invalidateCache: (query?: string) => void
}

export function useCombobox<T extends { id: string }>({
  fetchItems,
  fetchItem,
  value,
  onValueChange,
  mode = 'single',
  maxSelections,
  debounceMs = 300,
  itemsPerPage = 50,
  isOpen: controlledOpen,
  onOpenChange,
  cacheTTL = 5 * 60 * 1000,
  cacheKey: providedCacheKey,
  enableCache = true,
}: UseComboboxOptions<T>): UseComboboxReturn<T> {
  const [items, setItems] = useState<T[]>([])
  const [selectedItem, setSelectedItem] = useState<T | null>(null)
  const [selectedItems, setSelectedItems] = useState<T[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [internalOpen, setInternalOpen] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const abortControllerRef = useRef<AbortController | null>(null)
  const isInitialMount = useRef(true)
  const cacheKeyRef = useRef(
    providedCacheKey || `combobox-${Math.random().toString(36).slice(2, 9)}`
  )

  const getCacheKey = useCallback(
    (query: string, pageNum: number) =>
      `${cacheKeyRef.current}:${query}:${pageNum}:${itemsPerPage}`,
    [itemsPerPage]
  )

  const isCacheStale = useCallback(
    (entry: CacheEntry<T>) =>
      !enableCache || cacheTTL === 0 || Date.now() - entry.timestamp > cacheTTL,
    [enableCache, cacheTTL]
  )

  const getFromCache = useCallback(
    (query: string, pageNum: number): CacheEntry<T> | null => {
      if (!enableCache) return null
      const key = getCacheKey(query, pageNum)
      const entry = globalCache.get(key) as CacheEntry<T> | undefined
      if (!entry || isCacheStale(entry)) {
        if (entry) globalCache.delete(key)
        return null
      }
      return entry
    },
    [enableCache, getCacheKey, isCacheStale]
  )

  const setInCache = useCallback(
    (query: string, pageNum: number, items: T[], hasMoreItems: boolean) => {
      if (!enableCache) return
      globalCache.set(getCacheKey(query, pageNum), {
        items,
        hasMore: hasMoreItems,
        timestamp: Date.now(),
      })
      if (globalCache.size > 100) {
        Array.from(globalCache.keys())
          .slice(0, globalCache.size - 100)
          .forEach((k) => globalCache.delete(k))
      }
    },
    [enableCache, getCacheKey]
  )

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = useCallback(
    (newOpen: boolean) => {
      onOpenChange?.(newOpen) ?? setInternalOpen(newOpen)
    },
    [onOpenChange]
  )

  const abortPendingRequests = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  const loadItems = useCallback(
    async (query: string, pageNum: number, append = false) => {
      const cached = getFromCache(query, pageNum)
      if (cached && !append) {
        setItems(cached.items)
        setHasMore(cached.hasMore)
        setPage(pageNum)
        setIsLoading(false)
        return
      }

      abortPendingRequests()
      const ac = new AbortController()
      abortControllerRef.current = ac
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchItems(
          query,
          pageNum,
          itemsPerPage,
          ac.signal
        )
        if (ac.signal.aborted) return

        const newItems = response.items || []
        setInCache(query, pageNum, newItems, response.hasMore ?? false)
        setItems((prev) => (append ? [...prev, ...newItems] : newItems))
        setHasMore(response.hasMore ?? false)
        setPage(pageNum)

        if (value && !selectedItem && mode === 'single') {
          const found = newItems.find((i: T) => i.id === value)
          if (found) setSelectedItem(found)
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        setError((err as Error).message || 'Failed to load items.')
        setItems([])
        setHasMore(false)
      } finally {
        if (!ac.signal.aborted) setIsLoading(false)
      }
    },
    [
      fetchItems,
      value,
      selectedItem,
      mode,
      itemsPerPage,
      abortPendingRequests,
      getFromCache,
      setInCache,
    ]
  )

  useEffect(() => {
    if (!searchQuery.trim() && !isOpen) return
    const t = setTimeout(() => loadItems(searchQuery.trim(), 1, false), debounceMs)
    return () => {
      clearTimeout(t)
      abortPendingRequests()
    }
  }, [searchQuery, isOpen, debounceMs, loadItems, abortPendingRequests])

  useEffect(() => {
    if (!fetchItem) return
    const loadSelected = async () => {
      if (mode === 'single' && value && typeof value === 'string') {
        if (!selectedItem || selectedItem.id !== value) {
          try {
            const item = await fetchItem(value)
            setSelectedItem(item)
          } catch {
            setSelectedItem(null)
          }
        }
      } else if (!value) {
        setSelectedItem(null)
      }
      if (mode === 'multi' && value && Array.isArray(value) && value.length > 0) {
        try {
          const fetched = await Promise.all(value.map((id) => fetchItem(id)))
          setSelectedItems(fetched)
        } catch {
          setSelectedItems([])
        }
      } else if (!value || (Array.isArray(value) && value.length === 0)) {
        setSelectedItems([])
      }
    }
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    loadSelected()
  }, [value, selectedItem?.id, mode, fetchItem])

  const selectItem = useCallback(
    (item: T | null) => {
      if (mode === 'single') {
        setSelectedItem(item)
        onValueChange?.(item?.id ?? null)
        setIsOpen(false)
      }
    },
    [mode, onValueChange, setIsOpen]
  )

  const toggleItem = useCallback(
    (item: T) => {
      if (mode === 'multi') {
        setSelectedItems((prev) => {
          const isSelected = prev.some((i) => i.id === item.id)
          let next = isSelected
            ? prev.filter((i) => i.id !== item.id)
            : [...prev, item]
          if (maxSelections && next.length > maxSelections) next = prev
          onValueChange?.(next.map((i) => i.id))
          return next
        })
      }
    },
    [mode, maxSelections, onValueChange]
  )

  const removeItem = useCallback(
    (itemId: string) => {
      if (mode === 'multi') {
        setSelectedItems((prev) => {
          const next = prev.filter((i) => i.id !== itemId)
          onValueChange?.(next.map((i) => i.id))
          return next
        })
      }
    },
    [mode, onValueChange]
  )

  const clearSelection = useCallback(() => {
    if (mode === 'single') {
      selectItem(null)
    } else {
      setSelectedItems([])
      onValueChange?.([])
    }
  }, [mode, selectItem, onValueChange])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) loadItems(searchQuery.trim(), page + 1, true)
  }, [isLoading, hasMore, searchQuery, page, loadItems])

  const retry = useCallback(() => loadItems(searchQuery.trim(), 1, false), [
    searchQuery,
    loadItems,
  ])

  const clearCache = useCallback(() => {
    const prefix = cacheKeyRef.current
    const keys: string[] = []
    globalCache.forEach((_, k) => {
      if (k.startsWith(prefix)) keys.push(k)
    })
    keys.forEach((k) => globalCache.delete(k))
  }, [])

  const invalidateCache = useCallback(
    (query?: string) => {
      if (query === undefined) clearCache()
      else {
        const prefix = `${cacheKeyRef.current}:${query}:`
        const keys: string[] = []
        globalCache.forEach((_, k) => {
          if (k.startsWith(prefix)) keys.push(k)
        })
        keys.forEach((k) => globalCache.delete(k))
      }
    },
    [clearCache]
  )

  return {
    items,
    selectedItem,
    selectedItems,
    searchQuery,
    isLoading,
    error,
    isOpen,
    hasMore,
    page,
    mode,
    setSearchQuery,
    setIsOpen,
    selectItem,
    toggleItem,
    removeItem,
    clearSelection,
    loadMore,
    retry,
    clearCache,
    invalidateCache,
  }
}
