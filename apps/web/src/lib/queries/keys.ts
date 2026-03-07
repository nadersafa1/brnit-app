export type DataSource = 'admin' | 'nutritionist'

export const adminKeys = {
  foodCategories: (filters: object) => ['admin', 'food-categories', filters] as const,
  foodCategory: (id: string) => ['admin', 'food-categories', id] as const,
  foodItems: (filters: object) => ['admin', 'food-items', filters] as const,
  foodItem: (id: string) => ['admin', 'food-items', id] as const,
  meals: (filters: object) => ['admin', 'meals', filters] as const,
  meal: (id: string) => ['admin', 'meals', id] as const,
} as const

export const nutritionistKeys = {
  foodCategories: (filters: object) => ['nutritionist', 'food-categories', filters] as const,
  foodCategory: (id: string) => ['nutritionist', 'food-categories', id] as const,
  foodItems: (filters: object) => ['nutritionist', 'food-items', filters] as const,
  foodItem: (id: string) => ['nutritionist', 'food-items', id] as const,
  meals: (filters: object) => ['nutritionist', 'meals', filters] as const,
  meal: (id: string) => ['nutritionist', 'meals', id] as const,
} as const

export function getKeys(source: DataSource) {
  return source === 'nutritionist' ? nutritionistKeys : adminKeys
}
