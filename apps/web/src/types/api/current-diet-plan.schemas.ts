import { z } from 'zod'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const currentDietPlanQuerySchema = z
  .object({
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.from || !data.to) return true
      return data.from <= data.to
    },
    {
      message: 'from must be before or equal to to',
      path: ['to'],
    },
  )
  .refine(
    (data) => {
      if (!data.from || !data.to) return true
      const fromDate = new Date(data.from)
      const toDate = new Date(data.to)
      const diffMs = toDate.getTime() - fromDate.getTime()
      const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1
      return diffDays >= 1 && diffDays <= 31
    },
    {
      message: 'Range must be between 1 and 31 days',
      path: ['to'],
    },
  )

export type CurrentDietPlanQuery = z.infer<typeof currentDietPlanQuerySchema>

export type Macros = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Meal item as returned in current-diet-plan (with override support). */
export type CurrentDietPlanMealItem = {
  mealItemId: string
  foodItemId: string
  foodName: string
  quantity: number
  isOverridden: boolean
  originalFoodItemId?: string
  originalFoodName?: string
  originalQuantity?: number
  macros: Macros
}

export type CurrentDietPlanMeal = {
  dietPlanMealId: string
  mealId: string
  mealName: string
  mealType: string
  mealOrder: number
  mealItems: CurrentDietPlanMealItem[]
  consumed: boolean
  consumedAt?: string
  macros: Macros
}

export type CurrentDietPlanDay = {
  date: string
  meals: CurrentDietPlanMeal[]
  macros: Macros
}

