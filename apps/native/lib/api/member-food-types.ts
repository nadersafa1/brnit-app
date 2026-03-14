export type FoodItem = {
  id: string
  name: string
  categoryId: string
  categoryName: string | null
  calories: number
  protein: number
  carbs: number
  fat: number
  servingSize: number | null
  imageUrl: string | null
  createdAt: string
  updatedAt: string
}

export type FoodCategory = {
  id: string
  name: string
}

export type Pagination = {
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export type FoodItemsResponse = {
  data: FoodItem[]
  pagination: Pagination
}

export type FoodCategoriesResponse = {
  data: FoodCategory[]
}

export type SortBy = 'name' | 'calories' | 'protein' | 'carbs' | 'fat' | 'createdAt'
export type SortOrder = 'asc' | 'desc'

export type FoodItemsQuery = {
  q?: string
  categoryId?: string
  sortBy?: SortBy
  sortOrder?: SortOrder
  page?: number
  perPage?: number
}

export type FoodItemAlternative = {
  foodItemId: string
  name: string
  categoryId: string
  categoryName: string
  suggestedQuantityGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
  deltaCalories: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
}

export type FoodItemAlternativesResponse = {
  data: FoodItemAlternative[]
  pagination: Pagination
}

export type FoodItemAlternativesQuery = {
  quantity: number
  page?: number
  perPage?: number
}
