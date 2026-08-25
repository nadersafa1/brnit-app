'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useCloneMeal } from '@/hooks/use-meal-mutations'
import type { Meal } from '@/lib/queries/meals'
import type { DataSource } from '@/lib/queries/keys'

function mealsListBasePath(source: DataSource): string {
  return source === 'nutritionist' ? '/dashboard/nutritionist/meals' : '/dashboard/admin/meals'
}

/**
 * Navigation handlers for the shared meals list table (admin + nutritionist).
 * Centralizes URL prefixes so edit / delete-query / clone-then-open-detail stay consistent.
 */
export function useMealsListTableActions(source: DataSource = 'admin') {
  const router = useRouter()
  const { mutateAsync: cloneMealAsync } = useCloneMeal(source)
  const basePath = mealsListBasePath(source)

  const handleEdit = useCallback(
    (meal: Meal) => {
      router.push(`${basePath}/${meal.id}` as Route)
    },
    [router, basePath]
  )

  const handleDelete = useCallback(
    (meal: Meal) => {
      router.push(`${basePath}/${meal.id}?delete=1` as Route)
    },
    [router, basePath]
  )

  const handleClone = useCallback(
    async (meal: Meal) => {
      const created = await cloneMealAsync(meal.id)
      router.push(`${basePath}/${created.id}` as Route)
    },
    [cloneMealAsync, router, basePath]
  )

  return { handleEdit, handleDelete, handleClone }
}
