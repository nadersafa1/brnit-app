import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

export const mealItemSchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
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

// Add item input (same shape as mealItemSchema) - quantity = amount in units (e.g. grams)
const addMealItemSchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

// Update item input - quantity = amount in units (e.g. grams)
const updateMealItemSchema = z.object({
  mealItemId: z.uuid('Invalid meal item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

// Refined schemas to reject duplicates
const addArraySchema = z
  .array(addMealItemSchema)
  .refine(arr => new Set(arr.map(x => x.foodItemId)).size === arr.length, {
    message: 'Duplicate foodItemId in add array',
  })

const removeArraySchema = z.array(z.uuid('Invalid meal item ID')).refine(arr => new Set(arr).size === arr.length, {
  message: 'Duplicate mealItemId in remove array',
})

const updateArraySchema = z
  .array(updateMealItemSchema)
  .refine(arr => new Set(arr.map(x => x.mealItemId)).size === arr.length, {
    message: 'Duplicate mealItemId in update array',
  })

export const updateMealSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
    description: z.string().max(500).nullable().optional(),
    add: addArraySchema.optional(),
    remove: removeArraySchema.optional(),
    update: updateArraySchema.optional(),
  })
  .refine(
    data =>
      (data.add?.length ?? 0) + (data.remove?.length ?? 0) + (data.update?.length ?? 0) > 0 ||
      data.name !== undefined ||
      data.description !== undefined,
    {
      message: 'At least one of name, description, add, remove, or update must be provided',
    }
  )

export type MealItemInput = z.infer<typeof mealItemSchema>
export type MealsQuery = z.infer<typeof mealsQuerySchema>
export type CreateMeal = z.infer<typeof createMealSchema>
export type UpdateMeal = z.infer<typeof updateMealSchema>
