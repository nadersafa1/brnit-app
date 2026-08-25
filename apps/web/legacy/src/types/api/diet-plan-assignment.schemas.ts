import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

/** better-auth uses string IDs (not UUID) for member/organization. */
const idSchema = z.string().min(1, 'ID is required')

/** Nutritionist create: memberId only (no userId). */
const mealTimeOverrideSchema = z.object({
  dietPlanMealId: z.uuid('Invalid diet plan meal ID'),
  scheduledTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be HH:mm')
    .nullable(),
})

const mealTimeOverridesArraySchema = z
  .array(mealTimeOverrideSchema)
  .refine(
    arr => new Set(arr.map(item => item.dietPlanMealId)).size === arr.length,
    { message: 'Duplicate dietPlanMealId in mealTimeOverrides' }
  )

export const createDietPlanAssignmentNutritionistSchema = z
  .object({
    memberId: idSchema,
    dietPlanId: z.uuid('Invalid diet plan ID'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    mealTimeOverrides: mealTimeOverridesArraySchema.optional(),
  })
  .refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  })

export type CreateDietPlanAssignmentNutritionist = z.infer<
  typeof createDietPlanAssignmentNutritionistSchema
>

/** Exactly one of memberId or userId must be set. */
export const createDietPlanAssignmentSchema = z
  .object({
    memberId: idSchema.optional(),
    userId: idSchema.optional(),
    dietPlanId: z.uuid('Invalid diet plan ID'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    mealTimeOverrides: mealTimeOverridesArraySchema.optional(),
  })
  .refine(data => (data.memberId != null) !== (data.userId != null), {
    message: 'Exactly one of memberId or userId must be provided',
    path: ['memberId'],
  })
  .refine(data => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  })

export const updateDietPlanAssignmentSchema = z
  .object({
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    mealTimeOverrides: mealTimeOverridesArraySchema.optional(),
  })
  .refine(
    data => {
      if (data.startDate != null && data.endDate != null) return data.startDate <= data.endDate
      return true
    },
    { message: 'Start date must be before or equal to end date', path: ['endDate'] }
  )
  .refine(data => data.startDate !== undefined || data.endDate !== undefined || data.mealTimeOverrides !== undefined, {
    message: 'At least one of startDate, endDate, or mealTimeOverrides must be provided',
  })

export const dietPlanAssignmentsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['startDate', 'endDate', 'createdAt']).optional(),
  memberId: idSchema.optional(),
  userId: idSchema.optional(),
  dietPlanId: z.uuid().optional(),
  organizationId: idSchema.optional(),
})

export type CreateDietPlanAssignment = z.infer<typeof createDietPlanAssignmentSchema>
export type UpdateDietPlanAssignment = z.infer<typeof updateDietPlanAssignmentSchema>
export type DietPlanAssignmentsQuery = z.infer<typeof dietPlanAssignmentsQuerySchema>
