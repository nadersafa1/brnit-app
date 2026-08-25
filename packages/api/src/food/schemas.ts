import { DEFAULT_FOOD_UNIT, FOOD_UNITS } from "@brnit/domain";
import { z } from "zod";

import {
	paginationQuerySchema,
	sortQuerySchema,
	textSearchQuerySchema,
} from "../pagination/query-params";
import {
	DEFAULT_ALTERNATIVES_PER_PAGE,
	MAX_ALTERNATIVES_PER_PAGE,
} from "./alternatives";

/**
 * Zod input schemas for the food-category and food-item endpoints.
 *
 * Two families of schema live here and they coerce differently on purpose:
 *
 * - **query schemas** reuse the shared pagination/sort/search shapes, which
 *   parse the `string | undefined` values Express hands back from `req.query`.
 * - **field schemas** for food items parse **multipart** bodies. Every value
 *   arrives as a string, so numbers are `z.coerce`d and `clearImage` is the
 *   literal `"1"` / `"true"`. There is no JSON variant of these endpoints.
 */

const MAX_CATEGORY_NAME_LENGTH = 100;
const MAX_CATEGORY_DESCRIPTION_LENGTH = 2000;
const MAX_FOOD_ITEM_NAME_LENGTH = 255;
const MIN_CATEGORY_IDS = 1;
const MAX_CATEGORY_IDS = 20;

const DEFAULT_MACRO = 0;

const MAX_ALTERNATIVES_QUANTITY = 10_000;
const DEFAULT_ALTERNATIVES_PAGE = 1;
const MIN_ALTERNATIVES_PER_PAGE = 1;

/** Mirrors the `food_item_unit` Postgres enum via the domain constant. */
export const foodUnitSchema = z.enum(FOOD_UNITS);

// ---------------------------------------------------------------------------
// Route params
// ---------------------------------------------------------------------------

export const foodCategoryParamsSchema = z.object({
	foodCategoryId: z.string().min(1),
});

export const foodItemParamsSchema = z.object({
	foodItemId: z.string().min(1),
});

// ---------------------------------------------------------------------------
// Food categories
// ---------------------------------------------------------------------------

export const foodCategorySortBySchema = z
	.enum(["name", "createdAt"])
	.optional();

export const listFoodCategoriesInputSchema = z.object({
	...paginationQuerySchema.shape,
	...textSearchQuerySchema.shape,
	...sortQuerySchema.shape,
	sortBy: foodCategorySortBySchema,
});

/**
 * `name` is required on **both** create and update — the update endpoint has
 * never been a true PATCH, and the admin form always submits the full pair.
 */
const foodCategoryFieldsShape = {
	description: z
		.string()
		.max(
			MAX_CATEGORY_DESCRIPTION_LENGTH,
			`Description must be at most ${MAX_CATEGORY_DESCRIPTION_LENGTH} characters`
		)
		.optional(),
	name: z
		.string()
		.min(1, "Name is required")
		.max(
			MAX_CATEGORY_NAME_LENGTH,
			`Name must be less than ${MAX_CATEGORY_NAME_LENGTH} characters`
		),
};

export const createFoodCategoryInputSchema = z.object(foodCategoryFieldsShape);

export const updateFoodCategoryInputSchema = z.object(foodCategoryFieldsShape);

export const updateFoodCategoryByIdInputSchema = foodCategoryParamsSchema.extend(
	foodCategoryFieldsShape
);

// ---------------------------------------------------------------------------
// Food items
// ---------------------------------------------------------------------------

export const foodItemSortBySchema = z
	.enum(["name", "calories", "protein", "carbs", "fat", "createdAt"])
	.optional();

export const listFoodItemsInputSchema = z.object({
	...paginationQuerySchema.shape,
	...textSearchQuerySchema.shape,
	...sortQuerySchema.shape,
	categoryId: z.uuid().optional(),
	sortBy: foodItemSortBySchema,
});

const categoryIdsSchema = z
	.array(z.uuid("Invalid category ID"))
	.min(MIN_CATEGORY_IDS, "At least one category is required")
	.max(MAX_CATEGORY_IDS, `At most ${MAX_CATEGORY_IDS} categories allowed`)
	.transform((ids) => [...new Set(ids)]);

/** Any unit other than `100g` measures whole units, so it needs a gram equivalence. */
function unitRequiresGramsPerUnit(unit: string | undefined): boolean {
	return unit != null && unit !== DEFAULT_FOOD_UNIT;
}

/** Not `as const`: zod's refine options type wants a mutable `path` array. */
const gramsPerUnitRefinement = {
	message: "Grams per unit is required when unit is not 100g",
	path: ["gramsPerUnit"],
};

function hasGramsPerUnitWhenRequired(value: {
	gramsPerUnit?: number | null;
	unit?: string;
}): boolean {
	return (
		!unitRequiresGramsPerUnit(value.unit) ||
		(value.gramsPerUnit != null && value.gramsPerUnit > 0)
	);
}

const createFoodItemFieldsShape = {
	calories: z.coerce
		.number()
		.nonnegative("Calories must be non-negative")
		.optional()
		.default(DEFAULT_MACRO),
	carbs: z.coerce
		.number()
		.nonnegative("Carbs must be non-negative")
		.optional()
		.default(DEFAULT_MACRO),
	categoryIds: categoryIdsSchema,
	fat: z.coerce
		.number()
		.nonnegative("Fat must be non-negative")
		.optional()
		.default(DEFAULT_MACRO),
	gramsPerUnit: z.coerce
		.number()
		.positive("Grams per unit must be positive")
		.nullable()
		.optional(),
	name: z
		.string()
		.min(1, "Name is required")
		.max(
			MAX_FOOD_ITEM_NAME_LENGTH,
			`Name must be less than ${MAX_FOOD_ITEM_NAME_LENGTH} characters`
		),
	protein: z.coerce
		.number()
		.nonnegative("Protein must be non-negative")
		.optional()
		.default(DEFAULT_MACRO),
	unit: foodUnitSchema.optional().default(DEFAULT_FOOD_UNIT),
};

export const createFoodItemInputSchema = z
	.object(createFoodItemFieldsShape)
	.refine(hasGramsPerUnitWhenRequired, gramsPerUnitRefinement);

/**
 * Update fields are all optional; the "at least one change" rule is enforced by
 * the handler, because a bare `file` or `clearImage` also counts as a change
 * and neither is part of this schema.
 *
 * `unit` is **not** nullable here even though the pre-overhaul schema allowed
 * `null`: `food_item.unit` is `NOT NULL`, and a multipart body cannot carry a
 * JSON null anyway, so the nullable branch was unreachable and would only have
 * produced a constraint violation.
 */
const updateFoodItemFieldsShape = {
	calories: z.coerce
		.number()
		.nonnegative("Calories must be non-negative")
		.nullable()
		.optional(),
	carbs: z.coerce
		.number()
		.nonnegative("Carbs must be non-negative")
		.nullable()
		.optional(),
	categoryIds: categoryIdsSchema.optional(),
	clearImage: z
		.string()
		.optional()
		.transform((value) => value === "1" || value === "true"),
	fat: z.coerce
		.number()
		.nonnegative("Fat must be non-negative")
		.nullable()
		.optional(),
	gramsPerUnit: z.coerce
		.number()
		.positive("Grams per unit must be positive")
		.nullable()
		.optional(),
	name: z
		.string()
		.min(1, "Name is required")
		.max(
			MAX_FOOD_ITEM_NAME_LENGTH,
			`Name must be less than ${MAX_FOOD_ITEM_NAME_LENGTH} characters`
		)
		.optional(),
	protein: z.coerce
		.number()
		.nonnegative("Protein must be non-negative")
		.nullable()
		.optional(),
	unit: foodUnitSchema.optional(),
};

export const updateFoodItemInputSchema = z
	.object(updateFoodItemFieldsShape)
	.refine(hasGramsPerUnitWhenRequired, gramsPerUnitRefinement);

export const updateFoodItemByIdInputSchema = foodItemParamsSchema
	.extend(updateFoodItemFieldsShape)
	.refine(hasGramsPerUnitWhenRequired, gramsPerUnitRefinement);

// ---------------------------------------------------------------------------
// Alternatives
// ---------------------------------------------------------------------------

/**
 * `quantity` is required — alternatives are always computed against a concrete
 * amount of the reference food, never against its per-unit macros.
 */
export const foodItemAlternativesInputSchema = foodItemParamsSchema.extend({
	page: z.coerce
		.number()
		.int()
		.positive()
		.optional()
		.default(DEFAULT_ALTERNATIVES_PAGE),
	perPage: z.coerce
		.number()
		.int()
		.min(MIN_ALTERNATIVES_PER_PAGE)
		.max(MAX_ALTERNATIVES_PER_PAGE)
		.optional()
		.default(DEFAULT_ALTERNATIVES_PER_PAGE),
	quantity: z.coerce
		.number()
		.positive("Quantity must be positive")
		.max(
			MAX_ALTERNATIVES_QUANTITY,
			`Quantity must be at most ${MAX_ALTERNATIVES_QUANTITY}`
		),
});

// ---------------------------------------------------------------------------
// Inferred input types
// ---------------------------------------------------------------------------

export type FoodCategoryParams = z.infer<typeof foodCategoryParamsSchema>;
export type FoodItemParams = z.infer<typeof foodItemParamsSchema>;
export type ListFoodCategoriesInput = z.infer<
	typeof listFoodCategoriesInputSchema
>;
export type CreateFoodCategoryInput = z.infer<
	typeof createFoodCategoryInputSchema
>;
export type UpdateFoodCategoryInput = z.infer<
	typeof updateFoodCategoryInputSchema
>;
export type UpdateFoodCategoryByIdInput = z.infer<
	typeof updateFoodCategoryByIdInputSchema
>;
export type ListFoodItemsInput = z.infer<typeof listFoodItemsInputSchema>;
export type CreateFoodItemFields = z.infer<typeof createFoodItemInputSchema>;
export type UpdateFoodItemFields = z.infer<typeof updateFoodItemInputSchema>;
export type UpdateFoodItemByIdFields = z.infer<
	typeof updateFoodItemByIdInputSchema
>;
export type FoodItemAlternativesInput = z.infer<
	typeof foodItemAlternativesInputSchema
>;

/**
 * The uploaded image is not part of any Zod schema — multer parses it out of
 * the multipart stream and the controller hands the buffer to the handler
 * alongside the validated text fields.
 */
export interface FoodItemImageInput {
	/** Multipart image buffer from `req.file`, when one was attached. */
	file?: Buffer;
}

export type CreateFoodItemInput = CreateFoodItemFields & FoodItemImageInput;
export type UpdateFoodItemInput = UpdateFoodItemByIdFields & FoodItemImageInput;
