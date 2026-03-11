import { z } from 'zod'
import { standardPaginationSchema, standardSortSchema } from '@/lib/api-helpers/query-builders'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

const consumedItemSchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

export const createDietPlanMealConsumptionSchema = z.object({
  dietPlanAssignmentId: z.uuid('Invalid assignment ID'),
  dietPlanMealId: z.uuid('Invalid diet plan meal ID'),
  consumedAt: z
    .union([z.iso.datetime(), z.coerce.date(), z.date()])
    .transform(val => (val instanceof Date ? val : new Date(val))),
  consumedItems: z
    .array(consumedItemSchema)
    .max(50, 'consumedItems must have at most 50 entries')
    .optional(),
})

export const dietPlanMealConsumptionQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['consumedAt', 'consumedDate', 'createdAt']).optional(),
  dietPlanAssignmentId: z.uuid().optional(),
  dietPlanAssignmentIds: z.array(z.uuid()).optional(),
  consumedDateFrom: dateStringSchema.optional(),
  consumedDateTo: dateStringSchema.optional(),
})

export type ConsumedItemInput = z.infer<typeof consumedItemSchema>
export type CreateDietPlanMealConsumption = z.infer<typeof createDietPlanMealConsumptionSchema>
export type DietPlanMealConsumptionQuery = z.infer<typeof dietPlanMealConsumptionQuerySchema>
