'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { adminKeys } from '@/lib/queries/keys'
import type { CreateFoodCategory, UpdateFoodCategory } from '@/types/api/food.schemas'
import type { CreateFoodItem, UpdateFoodItem } from '@/types/api/food.schemas'

async function fetchWithAuth(
  url: string,
  options?: { method?: string; body?: string }
): Promise<Response> {
  const res = await fetch(url, {
    credentials: 'include',
    method: options?.method ?? 'GET',
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options?.body,
  })
  return res
}

export function useCreateFoodCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateFoodCategory) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodCategories, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create category')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-categories'] })
      toast.success('Category created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateFoodCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateFoodCategory & { id: string }) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodCategory(id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to update category')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: adminKeys.foodCategory(variables.id) })
      qc.invalidateQueries({ queryKey: ['admin', 'food-categories'] })
      toast.success('Category updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteFoodCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodCategory(id), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete category')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-categories'] })
      toast.success('Category deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useCreateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateFoodItem) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodItems, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to create food item')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-items'] })
      toast.success('Food item created')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateFoodItem & { id: string }) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodItem(id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to update food item')
      }
      return res.json()
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: adminKeys.foodItem(variables.id) })
      qc.invalidateQueries({ queryKey: ['admin', 'food-items'] })
      toast.success('Food item updated')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useDeleteFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetchWithAuth(API_ENDPOINTS.admin.foodItem(id), {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error ?? 'Failed to delete food item')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-items'] })
      toast.success('Food item deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
