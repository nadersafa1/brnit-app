'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { requireJsonSuccess } from '@/lib/api/error-handling'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import { fetchWithCredentials } from '@/lib/api/fetch-with-credentials'
import { adminKeys } from '@/lib/queries/keys'
import type {
  CreateFoodCategory,
  UpdateFoodCategory,
  CreateFoodItem,
  CreateFoodItemForm,
  UpdateFoodItem,
  UpdateFoodItemForm,
} from '@/types/api/food.schemas'

// --- Food categories (JSON API) ---

export function useCreateFoodCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateFoodCategory) => {
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodCategories, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to create category')
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
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodCategory(id), {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      return requireJsonSuccess(res, 'Failed to update category')
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
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodCategory(id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete category')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-categories'] })
      toast.success('Category deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// --- Food items (multipart for create/update) ---

function appendCategoryIds(formData: FormData, ids: string[]) {
  for (const id of ids) {
    formData.append('categoryIds', id)
  }
}

function buildCreateFoodItemFormData(data: CreateFoodItemForm, file?: File): FormData {
  const formData = new FormData()
  formData.append('name', data.name)
  appendCategoryIds(formData, data.categoryIds)
  if (data.calories != null) formData.append('calories', String(data.calories))
  if (data.protein != null) formData.append('protein', String(data.protein))
  if (data.carbs != null) formData.append('carbs', String(data.carbs))
  if (data.fat != null) formData.append('fat', String(data.fat))
  if (data.unit != null) formData.append('unit', String(data.unit))
  if (data.gramsPerUnit != null) formData.append('gramsPerUnit', String(data.gramsPerUnit))
  if (file) formData.append('file', file)
  return formData
}

export function useCreateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateFoodItem & { file?: File }) => {
      const { file, ...data } = payload
      const formData = buildCreateFoodItemFormData(data, file)
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodItems, {
        method: 'POST',
        body: formData,
      })
      return requireJsonSuccess(res, 'Failed to create food item')
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
  if (data.categoryIds != null) {
    appendCategoryIds(formData, data.categoryIds)
  }
  if (data.calories != null) formData.append('calories', String(data.calories))
  if (data.protein != null) formData.append('protein', String(data.protein))
  if (data.carbs != null) formData.append('carbs', String(data.carbs))
  if (data.fat != null) formData.append('fat', String(data.fat))
  if (data.unit != null) formData.append('unit', String(data.unit))
  if (data.gramsPerUnit != null) formData.append('gramsPerUnit', String(data.gramsPerUnit))
  if (options?.file) formData.append('file', options.file)
  if (options?.clearImage) formData.append('clearImage', 'true')
  return formData
}

export function useUpdateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: UpdateFoodItem & { id: string; file?: File; clearImage?: boolean }) => {
      const { id, file, clearImage, ...data } = payload
      const formData = buildUpdateFoodItemFormData(data, { file, clearImage })
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodItem(id), {
        method: 'PATCH',
        body: formData,
      })
      return requireJsonSuccess(res, 'Failed to update food item')
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
      const res = await fetchWithCredentials(API_ENDPOINTS.admin.foodItem(id), {
        method: 'DELETE',
      })
      return requireJsonSuccess(res, 'Failed to delete food item')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'food-items'] })
      toast.success('Food item deleted')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
