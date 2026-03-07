import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const dietPlanMealSchema = z.object({
  mealId: z.uuid('Invalid meal ID'),
  dayNumber: z.number().int().positive('Day number must be a positive integer'),
  mealType: z.string().min(1, 'Meal type is required').max(50, 'Meal type must be less than 50 characters'),
  mealOrder: z.number().int().positive('Meal order must be a positive integer').default(1),
})

export const dietPlansQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['name', 'startDate', 'endDate', 'createdAt']).optional(),
})

export const createDietPlanSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    description: z.string().max(500).optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    dietPlanMeals: z.array(dietPlanMealSchema).optional().default([]),
  })
  .refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  })

// Add item input for diet plan meals
const addDietPlanMealSchema = z.object({
  mealId: z.uuid('Invalid meal ID'),
  dayNumber: z.number().int().positive('Day number must be a positive integer'),
  mealType: z.string().min(1, 'Meal type is required').max(50, 'Meal type must be less than 50 characters'),
  mealOrder: z.number().int().positive('Meal order must be a positive integer').optional().default(1),
})

// Update item input for diet plan meals
const updateDietPlanMealSchema = z.object({
  dietPlanMealId: z.uuid('Invalid diet plan meal ID'),
  mealId: z.uuid('Invalid meal ID').optional(),
  dayNumber: z.number().int().positive().optional(),
  mealType: z.string().min(1).max(50).optional(),
  mealOrder: z.number().int().positive().optional(),
})

// Refined schemas to reject duplicates
const addArraySchema = z
  .array(addDietPlanMealSchema)
  .refine(
    arr => new Set(arr.map(x => `${x.dayNumber}-${x.mealType}-${x.mealOrder ?? 1}-${x.mealId}`)).size === arr.length,
    {
      message: 'Duplicate diet plan meal (same dayNumber, mealType, mealOrder, mealId) in add array',
    }
  )

const removeArraySchema = z.array(z.uuid('Invalid diet plan meal ID')).refine(arr => new Set(arr).size === arr.length, {
  message: 'Duplicate dietPlanMealId in remove array',
})

const updateArraySchema = z
  .array(updateDietPlanMealSchema)
  .refine(arr => new Set(arr.map(x => x.dietPlanMealId)).size === arr.length, {
    message: 'Duplicate dietPlanMealId in update array',
  })

export const updateDietPlanSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
    description: z.string().max(500).nullable().optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    add: addArraySchema.optional(),
    remove: removeArraySchema.optional(),
    update: updateArraySchema.optional(),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) return data.startDate <= data.endDate
      return true
    },
    { message: 'Start date must be before or equal to end date', path: ['endDate'] }
  )
  .refine(
    data =>
      (data.add?.length ?? 0) + (data.remove?.length ?? 0) + (data.update?.length ?? 0) > 0 ||
      data.name !== undefined ||
      data.description !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined,
    {
      message: 'At least one of name, description, startDate, endDate, add, remove, or update must be provided',
    }
  )

export type DietPlanMealInput = z.infer<typeof dietPlanMealSchema>
export type DietPlansQuery = z.infer<typeof dietPlansQuerySchema>
export type CreateDietPlan = z.infer<typeof createDietPlanSchema>
export type UpdateDietPlan = z.infer<typeof updateDietPlanSchema>
