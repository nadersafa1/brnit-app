'use client'

import { useMemo } from 'react'
import type { PaginationMeta } from '@/lib/api-helpers/pagination'
import type { PaginationConfig } from '@/lib/table-core'

/** Current list filters used when API pagination is not available yet (e.g. React Query loading). */
export type PaginationFallback = { page: number; perPage: number }

/**
 * Uses API `pagination` as-is when present (same shape as `PaginationMeta` / `PaginationConfig`).
 * When the client query has no payload yet (e.g. loading / initial), falls back to `paginationFallback`
 * so table chrome stays valid.
 */
export function paginationMetaToTableConfig(
  pagination: PaginationMeta | null | undefined,
  fallback: PaginationFallback
): PaginationConfig {
  if (pagination) {
    return {
      page: pagination.page,
      perPage: pagination.perPage,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    }
  }
  return {
    page: fallback.page,
    perPage: fallback.perPage,
    totalItems: 0,
    totalPages: 1,
  }
}

/** Resolves API pagination + client fallback for `BaseDataTable` / `TablePagination`. */
export function usePaginationTableConfig(
  paginationMeta: PaginationMeta | null | undefined,
  paginationFallback: PaginationFallback
): PaginationConfig {
  return useMemo(
    () => paginationMetaToTableConfig(paginationMeta, paginationFallback),
    [paginationMeta, paginationFallback.page, paginationFallback.perPage]
  )
}
