import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

/** Exactly one of memberId or userId must be set. */
export const createDietPlanAssignmentSchema = z
  .object({
    memberId: z.uuid('Invalid member ID').optional(),
    userId: z.uuid('Invalid user ID').optional(),
    dietPlanId: z.uuid('Invalid diet plan ID'),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
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
  })
  .refine(
    data => {
      if (data.startDate != null && data.endDate != null) return data.startDate <= data.endDate
      return true
    },
    { message: 'Start date must be before or equal to end date', path: ['endDate'] }
  )
  .refine(data => data.startDate !== undefined || data.endDate !== undefined, {
    message: 'At least one of startDate or endDate must be provided',
  })

export const dietPlanAssignmentsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['startDate', 'endDate', 'createdAt']).optional(),
  memberId: z.uuid().optional(),
  userId: z.uuid().optional(),
  dietPlanId: z.uuid().optional(),
})

export type CreateDietPlanAssignment = z.infer<typeof createDietPlanAssignmentSchema>
export type UpdateDietPlanAssignment = z.infer<typeof updateDietPlanAssignmentSchema>
export type DietPlanAssignmentsQuery = z.infer<typeof dietPlanAssignmentsQuerySchema>
