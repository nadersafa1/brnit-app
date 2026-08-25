/**
 * Shared multipart parsing for admin food item create/patch routes.
 * Keeps field lists and trimming logic in one place so POST and PATCH stay aligned.
 */

/** Scalar keys accepted from FormData for create and update (excluding categoryIds and clearImage). */
export const ADMIN_FOOD_ITEM_SCALAR_FORM_FIELDS = [
  'name',
  'calories',
  'protein',
  'carbs',
  'fat',
  'unit',
  'gramsPerUnit',
] as const

/** Non-empty trimmed strings only, so Zod coercion sees real values (not ""). */
export function parseAdminFoodItemScalarFields(formData: FormData): Record<string, unknown> {
  const parsed: Record<string, unknown> = {}
  for (const key of ADMIN_FOOD_ITEM_SCALAR_FORM_FIELDS) {
    const val = formData.get(key)
    if (typeof val === 'string' && val.trim() !== '') {
      parsed[key] = val
    }
  }
  return parsed
}

/** Multi-value `categoryIds` from FormData (one append per selected category). */
export function parseCategoryIdsFromForm(formData: FormData): string[] {
  return formData
    .getAll('categoryIds')
    .filter((v): v is string => typeof v === 'string' && v.trim() !== '')
}

/**
 * PATCH only: include clearImage when the key was sent so Zod can coerce to boolean.
 * Create route does not use this.
 */
export function mergeClearImageFieldIfPresent(
  formData: FormData,
  parsed: Record<string, unknown>
): void {
  const clearImageRaw = formData.get('clearImage')
  if (clearImageRaw !== null && clearImageRaw !== undefined) {
    parsed.clearImage = clearImageRaw
  }
}
