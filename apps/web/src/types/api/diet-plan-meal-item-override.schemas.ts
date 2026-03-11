import { z } from 'zod'

export const setDietPlanMealItemOverrideBodySchema = z.object({
  foodItemId: z.uuid('Invalid food item ID'),
  quantity: z.number().positive('Quantity must be positive'),
})

export type SetDietPlanMealItemOverrideBody = z.infer<typeof setDietPlanMealItemOverrideBodySchema>
