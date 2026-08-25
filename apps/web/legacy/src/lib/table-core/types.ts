/**
 * Table core types – pagination, sorting, base entity.
 */

export type SortOrder = 'asc' | 'desc'

export interface BaseTableEntity {
  id: string
  createdAt?: string | Date
  updatedAt?: string | Date
}

export interface PaginationConfig {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface SortConfig<TField extends string = string> {
  sortBy?: TField
  sortOrder?: SortOrder
}
