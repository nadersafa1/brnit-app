import { z } from 'zod'

export const quantitySchema = z.object({
  quantity: z
    .string()
    .min(1, 'Quantity is required')
    .refine(val => !Number.isNaN(Number(val)), 'Must be a number')
    .refine(val => Number(val) >= 1, 'Minimum 1 gram')
    .refine(val => Number(val) <= 10000, 'Maximum 10000 grams'),
})

export type QuantityFormValues = z.infer<typeof quantitySchema>
