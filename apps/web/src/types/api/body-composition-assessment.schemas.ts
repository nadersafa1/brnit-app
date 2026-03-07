import { z } from 'zod'
import { standardPaginationSchema, standardSortSchema } from '@/lib/api-helpers/query-builders'

const numericMetric = z.number().min(0).max(999.99)
const bodyFatPercent = z.number().min(0).max(100)
const bmiMetric = z.number().min(0).max(99.99)

/** Better-auth member ID format (e.g. nanoid), not UUID */
const memberIdSchema = z.string().min(1, 'Member ID is required').max(64, 'Invalid member ID')

export const createBodyCompositionAssessmentSchema = z.object({
  memberId: memberIdSchema,
  assessedAt: z.iso.datetime(),
  heightCm: numericMetric,
  bodyFatPercent,
  weightKg: numericMetric,
  bmi: bmiMetric,
  muscleMassKg: numericMetric,
  visceralFatAreaCm2: z.number().min(0).max(9999.99),
  bodyWaterL: numericMetric,
  imageUrl: z.url().optional().or(z.literal('')),
})

export const updateBodyCompositionAssessmentSchema = z
  .object({
    assessedAt: z.iso.datetime().optional(),
    heightCm: numericMetric.optional(),
    bodyFatPercent: bodyFatPercent.optional(),
    weightKg: numericMetric.optional(),
    bmi: bmiMetric.optional(),
    muscleMassKg: numericMetric.optional(),
    visceralFatAreaCm2: z.number().min(0).max(9999.99).optional(),
    bodyWaterL: numericMetric.optional(),
    imageUrl: z.url().optional().nullable(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided for update' })

export const bodyCompositionAssessmentsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['assessedAt', 'createdAt']).optional(),
  memberId: memberIdSchema.optional(),
})

export type CreateBodyCompositionAssessment = z.infer<typeof createBodyCompositionAssessmentSchema>
export type UpdateBodyCompositionAssessment = z.infer<typeof updateBodyCompositionAssessmentSchema>
export type BodyCompositionAssessmentsQuery = z.infer<typeof bodyCompositionAssessmentsQuerySchema>
