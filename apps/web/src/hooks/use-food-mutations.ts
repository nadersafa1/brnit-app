'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { adminKeys } from '@/lib/queries/keys'
import type {
  CreateFoodCategory,
  UpdateFoodCategory,
  CreateFoodItem,
  CreateFoodItemForm,
  UpdateFoodItem,
  UpdateFoodItemForm,
} from '@/types/api/food.schemas'

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

function buildCreateFoodItemFormData(data: CreateFoodItemForm, file?: File): FormData {
  const formData = new FormData()
  formData.append('name', data.name)
  formData.append('categoryId', data.categoryId)
  if (data.fdcId != null) formData.append('fdcId', String(data.fdcId))
  if (data.calories != null) formData.append('calories', String(data.calories))
  if (data.protein != null) formData.append('protein', String(data.protein))
  if (data.carbs != null) formData.append('carbs', String(data.carbs))
  if (data.fat != null) formData.append('fat', String(data.fat))
  if (data.servingSize != null) formData.append('servingSize', String(data.servingSize))
  if (file) formData.append('file', file)
  return formData
}

export function useCreateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateFoodItem & { file?: File }) => {
      const { file, ...data } = payload
      const formData = buildCreateFoodItemFormData(data, file)
      const res = await fetch(API_ENDPOINTS.admin.foodItems, {
        credentials: 'include',
        method: 'POST',
        body: formData,
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

function buildUpdateFoodItemFormData(
  data: Partial<UpdateFoodItemForm>,
  options?: { file?: File; clearImage?: boolean }
): FormData {
  const formData = new FormData()
  if (data.name != null) formData.append('name', data.name)
  if (data.categoryId != null) formData.append('categoryId', data.categoryId)
  if (data.fdcId != null) formData.append('fdcId', String(data.fdcId))
  if (data.calories != null) formData.append('calories', String(data.calories))
  if (data.protein != null) formData.append('protein', String(data.protein))
  if (data.carbs != null) formData.append('carbs', String(data.carbs))
  if (data.fat != null) formData.append('fat', String(data.fat))
  if (data.servingSize != null) formData.append('servingSize', String(data.servingSize))
  if (options?.file) formData.append('file', options.file)
  if (options?.clearImage) formData.append('clearImage', 'true')
  return formData
}

export function useUpdateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (
      payload: UpdateFoodItem & { id: string; file?: File; clearImage?: boolean }
    ) => {
      const { id, file, clearImage, ...data } = payload
      const formData = buildUpdateFoodItemFormData(data, { file, clearImage })
      const res = await fetch(API_ENDPOINTS.admin.foodItem(id), {
        credentials: 'include',
        method: 'PATCH',
        body: formData,
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
