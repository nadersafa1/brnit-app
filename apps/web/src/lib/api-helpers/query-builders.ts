import { z } from 'zod'
import { and, SQL } from 'drizzle-orm'

export const standardPaginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val >= 1, 'Page must be greater than 0'),
  perPage: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val >= 1 && val <= 100, 'perPage must be between 1 and 100'),
})

export const standardSortSchema = z.object({
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export const standardTextSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100, 'Search query must be less than 100 characters')
    .optional(),
})

export const calculateOffset = (page: number, perPage: number): number => {
  return (page - 1) * perPage
}

export const combineConditions = (
  conditions: (SQL<unknown> | undefined)[]
): SQL<unknown> | undefined => {
  const validConditions = conditions.filter((c) => c !== undefined) as SQL<unknown>[]

  if (validConditions.length === 0) {
    return undefined
  }

  return validConditions.reduce<SQL<unknown> | undefined>(
    (acc, condition) => (acc ? and(acc, condition) : condition),
    undefined
  )
}

export type StandardPagination = z.infer<typeof standardPaginationSchema>
export type StandardSort = z.infer<typeof standardSortSchema>
export type StandardTextSearch = z.infer<typeof standardTextSearchSchema>
