import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

export const foodItemsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['name', 'calories', 'protein', 'carbs', 'fat', 'createdAt']).optional(),
  categoryId: z.string().uuid().optional(),
})

export const foodCategoriesQuerySchema = z.object({
  ...standardTextSearchSchema.shape,
})

export const createFoodCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export const updateFoodCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export const createFoodItemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
  categoryId: z.string().uuid('Invalid category ID'),
  fdcId: z.number().int().optional(),
  calories: z.number().nonnegative('Calories must be non-negative').optional(),
  protein: z.number().nonnegative('Protein must be non-negative').optional(),
  carbs: z.number().nonnegative('Carbs must be non-negative').optional(),
  fat: z.number().nonnegative('Fat must be non-negative').optional(),
  servingSize: z.number().positive('Serving size must be positive').optional(),
})

export const updateFoodItemSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .optional(),
  categoryId: z.string().uuid('Invalid category ID').optional(),
  fdcId: z.number().int().nullable().optional(),
  calories: z.number().nonnegative('Calories must be non-negative').nullable().optional(),
  protein: z.number().nonnegative('Protein must be non-negative').nullable().optional(),
  carbs: z.number().nonnegative('Carbs must be non-negative').nullable().optional(),
  fat: z.number().nonnegative('Fat must be non-negative').nullable().optional(),
  servingSize: z.number().positive('Serving size must be positive').nullable().optional(),
})

export type FoodItemsQuery = z.infer<typeof foodItemsQuerySchema>
export type FoodCategoriesQuery = z.infer<typeof foodCategoriesQuerySchema>
export type CreateFoodCategory = z.infer<typeof createFoodCategorySchema>
export type UpdateFoodCategory = z.infer<typeof updateFoodCategorySchema>
export type CreateFoodItem = z.infer<typeof createFoodItemSchema>
export type UpdateFoodItem = z.infer<typeof updateFoodItemSchema>
