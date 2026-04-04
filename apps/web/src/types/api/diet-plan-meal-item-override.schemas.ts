import { z } from 'zod'

/** YYYY-MM-DD date string for override date scope and query params. */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const mealItemOverrideScopeSchema = z.enum(['single_day', 'rest_of_plan'])

const overrideBaseSchema = z.object({
  overrideId: z.uuid('Invalid override ID').optional(),
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

const explicitSingleDaySchema = overrideBaseSchema
  .extend({
    scope: z.literal('single_day'),
    startDate: dateStringSchema,
  })
  .strict()

const explicitRestOfPlanSchema = overrideBaseSchema
  .extend({
    scope: z.literal('rest_of_plan'),
    startDate: dateStringSchema,
  })
  .strict()

/** Explicit scope payload (preferred). */
export const setDietPlanMealItemOverrideBodySchema = z.union([
  explicitSingleDaySchema,
  explicitRestOfPlanSchema,
])

export type SetDietPlanMealItemOverrideBody = z.infer<typeof setDietPlanMealItemOverrideBodySchema>

/** Query params for GET meal-item alternatives (no quantity; server resolves from plan/override). */
export const mealItemAlternativesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().min(1).max(20).optional().default(10),
  /** Optional date (YYYY-MM-DD) to resolve override for that day; otherwise uses today. */
  date: dateStringSchema.optional(),
})

export type MealItemAlternativesQuery = z.infer<typeof mealItemAlternativesQuerySchema>
