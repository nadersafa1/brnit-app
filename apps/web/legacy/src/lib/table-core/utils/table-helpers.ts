/**
 * Table helpers – pagination range, visible pages, debounce.
 */

import type { PaginationConfig } from '../types'

export function calculatePagination(
  page: number,
  perPage: number,
  totalItems: number
): PaginationConfig {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
  const safePage = Math.max(1, Math.min(page, totalPages))
  return { page: safePage, perPage, totalItems, totalPages }
}

export function getPaginationRange(pagination: PaginationConfig): string {
  const { page, perPage, totalItems } = pagination
  const start = totalItems === 0 ? 0 : (page - 1) * perPage + 1
  const end = Math.min(page * perPage, totalItems)
  if (totalItems === 0) return '0-0 of 0'
  return `${start}-${end} of ${totalItems}`
}

export function getVisiblePages(
  currentPage: number,
  totalPages: number,
  maxVisible = 5
): (number | '...')[] {
  if (totalPages <= maxVisible)
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, currentPage - half)
  let end = Math.min(totalPages, currentPage + half)
  if (currentPage <= half) end = maxVisible
  else if (currentPage >= totalPages - half) start = totalPages - maxVisible + 1
  if (start > 1) {
    pages.push(1)
    if (start > 2) pages.push('...')
  }
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('...')
    pages.push(totalPages)
  }
  return pages
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null
  return function executed(...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      timeout = null
      func(...args)
    }, wait)
  }
}
