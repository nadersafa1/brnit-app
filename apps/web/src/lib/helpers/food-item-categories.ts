/**
 * Maps junction rows (with nested category) to API `{ id, name }[]` sorted by name.
 * Used anywhere food items expose their many-to-many categories (list, detail, alternatives).
 */
export function mapFoodCategoriesSorted(
  foodItemCategories: Array<{ category: { id: string; name: string } }>
): { id: string; name: string }[] {
  return foodItemCategories
    .map((x) => ({ id: x.category.id, name: x.category.name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** Comma-separated names in API order (for tables and subtitles). */
export function formatFoodCategoriesDisplay(
  categories: { name: string }[] | undefined | null,
  emptyLabel = '–'
): string {
  if (!categories?.length) return emptyLabel
  return categories.map((c) => c.name).join(', ')
}
