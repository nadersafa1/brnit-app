import { z } from 'zod'

export const consumptionStreakResponseSchema = z.object({
  streak: z.number().int().min(0),
})

export type ConsumptionStreakResponse = z.infer<
  typeof consumptionStreakResponseSchema
>
