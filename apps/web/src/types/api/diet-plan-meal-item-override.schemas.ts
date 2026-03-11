import { z } from 'zod'

export const setDietPlanMealItemOverrideBodySchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

export type SetDietPlanMealItemOverrideBody = z.infer<typeof setDietPlanMealItemOverrideBodySchema>

/** Query params for GET meal-item alternatives (no quantity; server resolves from plan/override). */
export const mealItemAlternativesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(10),
})

export type MealItemAlternativesQuery = z.infer<typeof mealItemAlternativesQuerySchema>
