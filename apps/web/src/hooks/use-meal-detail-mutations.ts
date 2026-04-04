'use client'

import { useCallback } from 'react'
import { useDeleteMeal, useUpdateMeal } from '@/hooks/use-meal-mutations'
import type { DataSource } from '@/lib/queries/keys'

/** Typed dashboard paths for Next.js `Link` / `router.push`. */
const MEAL_LIST_PATH = {
  admin: '/dashboard/admin/meals',
  nutritionist: '/dashboard/nutritionist/meals',
} as const satisfies Record<DataSource, string>

/**
 * Meal detail page: update/delete meal and manage meal items via PATCH.
 * React Query mutations already invalidate list + detail; callers own dialog/UI state.
 */
export function useMealDetailMutations(id: string, source: DataSource = 'admin') {
  const updateMeal = useUpdateMeal(source)
  const deleteMeal = useDeleteMeal(source)
  const listPath = MEAL_LIST_PATH[source]

  const saveMetadata = useCallback(
    async (data: { name: string; description?: string }) => {
      await updateMeal.mutateAsync({
        id,
        name: data.name,
        description: data.description?.trim() || null,
      })
    },
    [id, updateMeal]
  )

  const addFoodItem = useCallback(
    async (foodItemId: string, quantity: number) => {
      await updateMeal.mutateAsync({ id, add: [{ foodItemId, quantity }] })
    },
    [id, updateMeal]
  )

  const setMealItemQuantity = useCallback(
    async (mealItemId: string, quantity: number) => {
      await updateMeal.mutateAsync({ id, update: [{ mealItemId, quantity }] })
    },
    [id, updateMeal]
  )

  const removeMealItem = useCallback(
    async (mealItemId: string) => {
      await updateMeal.mutateAsync({ id, remove: [mealItemId] })
    },
    [id, updateMeal]
  )

  const removeMealItems = useCallback(
    async (mealItemIds: string[]) => {
      if (mealItemIds.length === 0) return
      await updateMeal.mutateAsync({ id, remove: mealItemIds })
    },
    [id, updateMeal]
  )

  const setMealItemsQuantityBulk = useCallback(
    async (mealItemIds: string[], quantity: number) => {
      if (mealItemIds.length === 0) return
      await updateMeal.mutateAsync({
        id,
        update: mealItemIds.map(mealItemId => ({ mealItemId, quantity })),
      })
    },
    [id, updateMeal]
  )

  return {
    updateMeal,
    deleteMeal,
    listPath,
    saveMetadata,
    addFoodItem,
    setMealItemQuantity,
    removeMealItem,
    removeMealItems,
    setMealItemsQuantityBulk,
  }
}
