/**
 * Admin users table types.
 */

import type { SortOrder } from '@/lib/table-core'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: Date | null
  createdAt: Date
}

export type AdminUsersSortBy = 'name' | 'email' | 'role' | 'createdAt'

export interface AdminUsersFilters {
  q: string
  role: string
  page: number
  perPage: number
  sortBy: AdminUsersSortBy
  sortOrder: SortOrder
}

export interface AdminUsersResponse {
  users: AdminUser[]
  pagination: {
    page: number
    perPage: number
    totalItems: number
    totalPages: number
  }
}
