/**
 * Comma-separated category labels for food list cards (order matches API).
 */
export function formatFoodCategoriesDisplay(
	categories: { name: string }[]
): string {
	return categories.map((c) => c.name).join(", ");
}
