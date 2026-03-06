import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

export const mealItemSchema = z.object({
  foodItemId: z.string().uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

export const mealsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['name', 'createdAt']).optional(),
})

export const createMealSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  description: z.string().max(500).optional(),
  mealItems: z.array(mealItemSchema).optional().default([]),
})

export const updateMealSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .optional(),
  description: z.string().max(500).nullable().optional(),
  mealItems: z.array(mealItemSchema).optional(),
})

export type MealItemInput = z.infer<typeof mealItemSchema>
export type MealsQuery = z.infer<typeof mealsQuerySchema>
export type CreateMeal = z.infer<typeof createMealSchema>
export type UpdateMeal = z.infer<typeof updateMealSchema>
