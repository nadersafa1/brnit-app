import { z } from 'zod'
import { standardPaginationSchema, standardSortSchema } from '@/lib/api-helpers/query-builders'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const createDietPlanMealConsumptionSchema = z.object({
  dietPlanAssignmentId: z.uuid('Invalid assignment ID'),
  dietPlanMealId: z.uuid('Invalid diet plan meal ID'),
  consumedAt: z
    .union([z.iso.datetime(), z.coerce.date(), z.date()])
    .transform(val => (val instanceof Date ? val : new Date(val))),
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

export type CreateDietPlanMealConsumption = z.infer<typeof createDietPlanMealConsumptionSchema>
export type DietPlanMealConsumptionQuery = z.infer<typeof dietPlanMealConsumptionQuerySchema>
