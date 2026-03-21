import { z } from 'zod'
import {
  standardPaginationSchema,
  standardSortSchema,
  standardTextSearchSchema,
} from '@/lib/api-helpers/query-builders'

export const foodItemsQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['name', 'calories', 'protein', 'carbs', 'fat', 'createdAt']).optional(),
  categoryId: z.uuid().optional(),
})

export const foodCategoriesQuerySchema = z.object({
  ...standardPaginationSchema.shape,
  ...standardTextSearchSchema.shape,
  ...standardSortSchema.shape,
  sortBy: z.enum(['name', 'createdAt']).optional(),
})

export const createFoodCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export const updateFoodCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export const foodUnitSchema = z.enum(['100g', 'piece', 'liters', 'cup', 'tbsp'])
export type FoodUnit = z.infer<typeof foodUnitSchema>

/** Non-100g units need gramsPerUnit (weight of one piece, per L, per cup, per tbsp, etc.). */
const unitRequiresGramsPerUnit = (unit: FoodUnit | undefined) => unit != null && unit !== '100g'

/** Create payload: name, categoryId, and macros (calories, protein, carbs, fat) required; fdcId, servingSize, unit, gramsPerUnit optional. When unit is not 100g, gramsPerUnit is required. */
export const createFoodItemSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    categoryId: z.uuid('Invalid category ID'),
    fdcId: z.number().int().optional(),
    calories: z.number().nonnegative('Calories must be non-negative'),
    protein: z.number().nonnegative('Protein must be non-negative'),
    carbs: z.number().nonnegative('Carbs must be non-negative'),
    fat: z.number().nonnegative('Fat must be non-negative'),
    servingSize: z.number().positive('Serving size must be positive').optional(),
    unit: foodUnitSchema.optional().default('100g'),
    gramsPerUnit: z.number().positive('Grams per unit must be positive').nullable().optional(),
  })
  .refine(
    data =>
      !unitRequiresGramsPerUnit(data.unit) ||
      (data.gramsPerUnit != null && data.gramsPerUnit > 0),
    {
      message: 'Grams per unit is required when unit is not 100g',
      path: ['gramsPerUnit'],
    }
  )

export const updateFoodItemSchema = z
  .object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters').optional(),
  categoryId: z.uuid('Invalid category ID').optional(),
  fdcId: z.number().int().nullable().optional(),
  calories: z.number().nonnegative('Calories must be non-negative').nullable().optional(),
  protein: z.number().nonnegative('Protein must be non-negative').nullable().optional(),
  carbs: z.number().nonnegative('Carbs must be non-negative').nullable().optional(),
  fat: z.number().nonnegative('Fat must be non-negative').nullable().optional(),
  servingSize: z.number().positive('Serving size must be positive').nullable().optional(),
  unit: foodUnitSchema.nullable().optional(),
  gramsPerUnit: z.number().positive('Grams per unit must be positive').nullable().optional(),
  })
  .refine(
    data => {
      const u = data.unit
      if (u === undefined || u === null) return true
      if (u === '100g') return true
      return data.gramsPerUnit != null && data.gramsPerUnit > 0
    },
    {
      message: 'Grams per unit is required when unit is not 100g',
      path: ['gramsPerUnit'],
    }
  )

/** FormData parsing for POST create — coerce form string values */
export const createFoodItemFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name must be less than 255 characters'),
    categoryId: z.string().min(1).pipe(z.uuid('Invalid category ID')),
    fdcId: z.coerce.number().int().optional(),
    calories: z.coerce.number().nonnegative('Calories must be non-negative'),
    protein: z.coerce.number().nonnegative('Protein must be non-negative'),
    carbs: z.coerce.number().nonnegative('Carbs must be non-negative'),
    fat: z.coerce.number().nonnegative('Fat must be non-negative'),
    servingSize: z.coerce.number().positive('Serving size must be positive').optional(),
    unit: foodUnitSchema.optional().default('100g'),
    gramsPerUnit: z.coerce.number().positive('Grams per unit must be positive').nullable().optional(),
  })
  .refine(
    data =>
      !unitRequiresGramsPerUnit(data.unit) ||
      (data.gramsPerUnit != null && data.gramsPerUnit > 0),
    {
      message: 'Grams per unit is required when unit is not 100g',
      path: ['gramsPerUnit'],
    }
  )

/** FormData parsing for PATCH update — optional fields + clearImage */
export const updateFoodItemFormSchema = z
  .object({
  name: z.string().min(1, 'Name is required').max(255).optional(),
  categoryId: z.string().min(1).pipe(z.uuid('Invalid category ID')).optional(),
  fdcId: z.coerce.number().int().nullable().optional(),
  calories: z.coerce.number().nonnegative().nullable().optional(),
  protein: z.coerce.number().nonnegative().nullable().optional(),
  carbs: z.coerce.number().nonnegative().nullable().optional(),
  fat: z.coerce.number().nonnegative().nullable().optional(),
  servingSize: z.coerce.number().positive().nullable().optional(),
  unit: foodUnitSchema.nullable().optional(),
  gramsPerUnit: z.coerce.number().positive().nullable().optional(),
  clearImage: z
    .string()
    .optional()
    .transform((v) => v === '1' || v === 'true'),
  })
  .refine(
    data => {
      const u = data.unit
      if (u === undefined || u === null) return true
      if (u === '100g') return true
      return data.gramsPerUnit != null && data.gramsPerUnit > 0
    },
    {
      message: 'Grams per unit is required when unit is not 100g',
      path: ['gramsPerUnit'],
    }
  )

export type FoodItemsQuery = z.infer<typeof foodItemsQuerySchema>
export type FoodCategoriesQuery = z.infer<typeof foodCategoriesQuerySchema>
export type CreateFoodCategory = z.infer<typeof createFoodCategorySchema>
export type UpdateFoodCategory = z.infer<typeof updateFoodCategorySchema>
export type CreateFoodItem = z.infer<typeof createFoodItemSchema>
export type UpdateFoodItem = z.infer<typeof updateFoodItemSchema>

/** Query params for GET /api/member/me/food-items/:foodItemId/alternatives */
export const foodItemAlternativesQuerySchema = z.object({
  quantity: z.coerce
    .number()
    .positive('Quantity must be positive')
    .max(10000, 'Quantity must be at most 10000'),
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .default(10),
})

export type FoodItemAlternativesQuery = z.infer<typeof foodItemAlternativesQuerySchema>
export type CreateFoodItemForm = z.infer<typeof createFoodItemFormSchema>
export type UpdateFoodItemForm = z.infer<typeof updateFoodItemFormSchema>
