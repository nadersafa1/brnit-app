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
    clearImage: z.boolean().optional(),
  })
  .refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided for update' })

/** Coerce form-data string values into create schema */
export const createBodyCompositionAssessmentFormSchema = z.object({
  memberId: memberIdSchema,
  assessedAt: z.string().min(1).transform(s => s.trim()).pipe(z.iso.datetime()),
  heightCm: z.coerce.number().pipe(numericMetric),
  bodyFatPercent: z.coerce.number().pipe(bodyFatPercent),
  weightKg: z.coerce.number().pipe(numericMetric),
  bmi: z.coerce.number().pipe(bmiMetric),
  muscleMassKg: z.coerce.number().pipe(numericMetric),
  visceralFatAreaCm2: z.coerce.number().pipe(z.number().min(0).max(9999.99)),
  bodyWaterL: z.coerce.number().pipe(numericMetric),
})

/** Coerce form-data string values into update schema */
const updateFormFields = z.object({
  assessedAt: z.string().min(1).transform(s => s.trim()).pipe(z.iso.datetime()).optional(),
  heightCm: z.coerce.number().pipe(numericMetric).optional(),
  bodyFatPercent: z.coerce.number().pipe(bodyFatPercent).optional(),
  weightKg: z.coerce.number().pipe(numericMetric).optional(),
  bmi: z.coerce.number().pipe(bmiMetric).optional(),
  muscleMassKg: z.coerce.number().pipe(numericMetric).optional(),
  visceralFatAreaCm2: z.coerce.number().pipe(z.number().min(0).max(9999.99)).optional(),
  bodyWaterL: z.coerce.number().pipe(numericMetric).optional(),
  clearImage: z
    .string()
    .optional()
    .transform(v => v === '1' || v === 'true'),
})

export const updateBodyCompositionAssessmentFormSchema = updateFormFields

export const bodyCompositionAssessmentsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['assessedAt', 'createdAt']).optional(),
  memberId: memberIdSchema.optional(),
})

/** Member-facing recent assessments list: optional orgId, optional limit (default 5, max 20). */
export const memberRecentAssessmentsQuerySchema = z.object({
  orgId: z.string().min(1).max(64).optional(),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? Number.parseInt(val, 10) : 5))
    .pipe(z.number().min(1).max(20)),
})

/** Member-facing single assessment: orgId required to resolve member and enforce ownership. */
export const memberSingleAssessmentQuerySchema = z.object({
  orgId: z.string().min(1, 'orgId is required').max(64),
})

export type CreateBodyCompositionAssessment = z.infer<typeof createBodyCompositionAssessmentSchema>
export type UpdateBodyCompositionAssessment = z.infer<typeof updateBodyCompositionAssessmentSchema>
export type BodyCompositionAssessmentsQuery = z.infer<typeof bodyCompositionAssessmentsQuerySchema>
export type MemberRecentAssessmentsQuery = z.infer<typeof memberRecentAssessmentsQuerySchema>
export type MemberSingleAssessmentQuery = z.infer<typeof memberSingleAssessmentQuerySchema>
