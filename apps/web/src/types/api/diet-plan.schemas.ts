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

export const updateDietPlanSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
    description: z.string().max(500).nullable().optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    dietPlanMeals: z.array(dietPlanMealSchema).optional(),
  })
  .refine(
    data => {
      if (data.startDate && data.endDate) return data.startDate <= data.endDate
      return true
    },
    { message: 'Start date must be before or equal to end date', path: ['endDate'] }
  )

export type DietPlanMealInput = z.infer<typeof dietPlanMealSchema>
export type DietPlansQuery = z.infer<typeof dietPlansQuerySchema>
export type CreateDietPlan = z.infer<typeof createDietPlanSchema>
export type UpdateDietPlan = z.infer<typeof updateDietPlanSchema>
