import type { FoodCategory } from '@/lib/queries/food-categories'

/**
 * Locked categories (e.g. required by the current page) appear first; remainder sorted by name.
 */
export function sortFoodCategoriesLockedFirst(
  categories: readonly FoodCategory[],
  lockedCategoryIds: readonly string[]
): FoodCategory[] {
  const locked = new Set(lockedCategoryIds)
  return [...categories].sort((a, b) => {
    const orderA = locked.has(a.id) ? 0 : 1
    const orderB = locked.has(b.id) ? 0 : 1
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}
