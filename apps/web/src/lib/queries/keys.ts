export const adminKeys = {
  foodCategories: (filters: object) => ['admin', 'food-categories', filters] as const,
  foodCategory: (id: string) => ['admin', 'food-categories', id] as const,
  foodItems: (filters: object) => ['admin', 'food-items', filters] as const,
  foodItem: (id: string) => ['admin', 'food-items', id] as const,
} as const
