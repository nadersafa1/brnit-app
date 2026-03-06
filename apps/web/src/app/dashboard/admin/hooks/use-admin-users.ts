'use client'

import { authClient } from '@/lib/auth-client'
import { useCallback, useEffect, useState } from 'react'
import type { AdminUsersFilters, AdminUsersResponse } from '../types'

const defaultFilters: AdminUsersFilters = {
  q: '',
  role: '',
  page: 1,
  perPage: 25,
  sortBy: 'createdAt',
  sortOrder: 'desc',
}

export function useAdminUsers() {
  const [filters, setFilters] = useState<AdminUsersFilters>(defaultFilters)
  const [data, setData] = useState<AdminUsersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async (f: AdminUsersFilters) => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: result, error: listError } = await authClient.admin.listUsers({
        query: {
          limit: f.perPage,
          offset: (f.page - 1) * f.perPage,
          sortBy: f.sortBy,
          sortDirection: f.sortOrder,
          ...(f.q && {
            searchValue: f.q,
            searchField: 'email',
            searchOperator: 'contains',
          }),
          ...(f.role && {
            filterField: 'role',
            filterValue: f.role,
            filterOperator: 'eq',
          }),
        },
      })

      if (listError) {
        throw new Error(listError.message ?? 'Failed to fetch users')
      }

      const rawUsers = result?.users ?? []
      const users = rawUsers.map((u) => ({
        ...u,
        role: u.role ?? null,
      })) as AdminUsersResponse['users']
      const total = result?.total ?? 0
      const totalPages = Math.ceil(total / f.perPage)

      setData({
        users,
        pagination: {
          page: f.page,
          perPage: f.perPage,
          totalItems: total,
          totalPages,
        },
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch users')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(filters)
  }, [filters, fetchUsers])

  const setFiltersAndFetch = useCallback((next: Partial<AdminUsersFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }))
  }, [])

  const refetch = useCallback(() => fetchUsers(filters), [filters, fetchUsers])

  return {
    users: data?.users ?? [],
    pagination: data?.pagination
      ? {
          page: data.pagination.page,
          limit: data.pagination.perPage,
          totalItems: data.pagination.totalItems,
          totalPages: data.pagination.totalPages,
        }
      : {
          page: 1,
          limit: filters.perPage,
          totalItems: 0,
          totalPages: 1,
        },
    filters,
    setFilters: setFiltersAndFetch,
    isLoading,
    error,
    refetch,
    clearError: () => setError(null),
  }
}
