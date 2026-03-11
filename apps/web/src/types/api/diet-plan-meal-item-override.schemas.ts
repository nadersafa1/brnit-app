import { z } from 'zod'

/** YYYY-MM-DD date string for override date scope and query params. */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')

export const setDietPlanMealItemOverrideBodySchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
  /** If provided: override applies only for this date. If omitted: override applies for future dates only. */
  date: dateStringSchema.optional(),
})

export type SetDietPlanMealItemOverrideBody = z.infer<typeof setDietPlanMealItemOverrideBodySchema>

/** Query params for GET meal-item alternatives (no quantity; server resolves from plan/override). */
export const mealItemAlternativesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().min(1).max(20).optional().default(10),
  /** Optional date (YYYY-MM-DD) to resolve override for that day; otherwise uses today. */
  date: dateStringSchema.optional(),
})

export type MealItemAlternativesQuery = z.infer<typeof mealItemAlternativesQuerySchema>
