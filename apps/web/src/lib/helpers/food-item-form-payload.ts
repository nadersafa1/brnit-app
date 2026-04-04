import { createFoodItemSchema, updateFoodItemSchema } from '@/types/api/food.schemas'
import type { z } from 'zod'

type CreateFormData = z.infer<typeof createFoodItemSchema>
type UpdateFormData = z.infer<typeof updateFoodItemSchema>

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && !Number.isNaN(value) ? value : undefined
}

export type FoodItemFormRawValues = {
  name: string
  categoryIds: string[]
  calories: unknown
  protein: unknown
  carbs: unknown
  fat: unknown
  unit: string
  gramsPerUnit?: unknown
}

/**
 * Create mode only: merges locked category IDs into the selection (deduped). Edit mode returns `raw` unchanged.
 */
export function withMergedLockedCategoryIds(
  raw: FoodItemFormRawValues,
  isEdit: boolean,
  lockedCategoryIds: readonly string[]
): FoodItemFormRawValues {
  if (isEdit || lockedCategoryIds.length === 0) return raw
  return {
    ...raw,
    categoryIds: [...new Set([...lockedCategoryIds, ...raw.categoryIds])],
  }
}

/**
 * Maps validated react-hook-form values into API body shapes.
 * Update mode normalizes optional macro fields to `null` so PATCH clears match backend expectations.
 */
export function buildFoodItemSubmitPayload(raw: FoodItemFormRawValues, isEdit: boolean): CreateFormData | UpdateFormData {
  const shared = {
    ...raw,
    calories: asOptionalNumber(raw.calories),
    protein: asOptionalNumber(raw.protein),
    carbs: asOptionalNumber(raw.carbs),
    fat: asOptionalNumber(raw.fat),
    unit: raw.unit,
    gramsPerUnit: asOptionalNumber(raw.gramsPerUnit) ?? null,
  }

  if (!isEdit) {
    return shared as CreateFormData
  }

  return {
    ...shared,
    calories: shared.calories ?? null,
    protein: shared.protein ?? null,
    carbs: shared.carbs ?? null,
    fat: shared.fat ?? null,
  } as UpdateFormData
}
