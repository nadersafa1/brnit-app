export type FoodUnit = '100g' | 'piece' | 'liters' | 'cup' | 'tbsp'

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
  unit: FoodUnit
  gramsPerUnit: number | null
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
  /** Suggested quantity in this alternative food's unit (e.g. 10 for "10 eggs", 150 for "150g"). */
  suggestedQuantity: number
  unit: FoodUnit
  calories: number
  protein: number
  carbs: number
  fat: number
  deltaCalories: number
  deltaProtein: number
  deltaCarbs: number
  deltaFat: number
  /** @deprecated Use suggestedQuantity + unit for display. */
  suggestedQuantityGrams?: number
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
