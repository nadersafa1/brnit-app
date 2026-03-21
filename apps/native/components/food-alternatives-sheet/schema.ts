import { z } from 'zod'

/** Base validation; unit step rules are enforced on submit in `FoodAlternativesSheet`. */
export const quantitySchema = z.object({
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine((val) => !Number.isNaN(Number(val)), 'Must be a number')
    .refine((val) => Number(val) > 0, 'Must be positive')
    .refine((val) => Number(val) <= 10000, 'Maximum 10000'),
})

export type QuantityFormValues = z.infer<typeof quantitySchema>
