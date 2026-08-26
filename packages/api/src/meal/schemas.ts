import { z } from "zod";

import {
	paginationQuerySchema,
	sortQuerySchema,
	textSearchQuerySchema,
} from "../pagination/query-params";
import { MEAL_NAME_MAX_LENGTH } from "./clone-name";

/**
 * Input contract for the meal endpoints, mounted identically under
 * `/admin/meals` and `/nutritionist/meals`.
 *
 * Route ids are `z.string().min(1)`, not `z.uuid()`: `meal.id` is a plain
 * `text` column filled by `crypto.randomUUID()` in the application, and the
 * pre-overhaul routes answered **404** for an unknown id rather than 400 for a
 * malformed one. Ids inside request *bodies* keep the `uuid()` checks the old
 * schemas had, because those are client-authored references.
 */

const DESCRIPTION_MAX_LENGTH = 500;

const mealNameSchema = z
	.string()
	.min(1, "Name is required")
	.max(MEAL_NAME_MAX_LENGTH, "Name must be less than 255 characters");

const quantitySchema = z.number().positive("Quantity must be positive");

/** A line on a meal: how much of which food. */
export const mealItemInputSchema = z.object({
	foodItemId: z.uuid("Invalid food item ID"),
	quantity: quantitySchema,
});

export const mealParamsSchema = z.object({
	mealId: z.string().min(1),
});

export const listMealsInputSchema = z.object({
	...paginationQuerySchema.shape,
	...textSearchQuerySchema.shape,
	...sortQuerySchema.shape,
	sortBy: z.enum(["name", "createdAt"]).optional(),
});

export const createMealInputSchema = z.object({
	description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
	mealItems: z.array(mealItemInputSchema).optional().default([]),
	name: mealNameSchema,
});

const addMealItemSchema = z.object({
	foodItemId: z.uuid("Invalid food item ID"),
	quantity: quantitySchema,
});

const updateMealItemSchema = z.object({
	mealItemId: z.uuid("Invalid meal item ID"),
	quantity: quantitySchema,
});

/**
 * Duplicate entries are rejected here rather than in the handler: two `add`
 * rows for the same food, or two `update` rows for the same line, describe an
 * ambiguous intent that no mutation order can satisfy.
 */
const addArraySchema = z
	.array(addMealItemSchema)
	.refine((arr) => new Set(arr.map((x) => x.foodItemId)).size === arr.length, {
		message: "Duplicate foodItemId in add array",
	});

const removeArraySchema = z
	.array(z.uuid("Invalid meal item ID"))
	.refine((arr) => new Set(arr).size === arr.length, {
		message: "Duplicate mealItemId in remove array",
	});

const updateArraySchema = z
	.array(updateMealItemSchema)
	.refine((arr) => new Set(arr.map((x) => x.mealItemId)).size === arr.length, {
		message: "Duplicate mealItemId in update array",
	});

const updateMealShape = {
	add: addArraySchema.optional(),
	description: z.string().max(DESCRIPTION_MAX_LENGTH).nullable().optional(),
	name: mealNameSchema.optional(),
	remove: removeArraySchema.optional(),
	update: updateArraySchema.optional(),
};

const AT_LEAST_ONE_FIELD_MESSAGE =
	"At least one of name, description, add, remove, or update must be provided";

function hasAnyMealMutation(value: {
	add?: unknown[];
	description?: string | null;
	name?: string;
	remove?: unknown[];
	update?: unknown[];
}): boolean {
	return (
		(value.add?.length ?? 0) +
			(value.remove?.length ?? 0) +
			(value.update?.length ?? 0) >
			0 ||
		value.name !== undefined ||
		value.description !== undefined
	);
}

/** Request body for `PATCH /meals/:id`, before the route id is folded in. */
export const updateMealBodySchema = z
	.object(updateMealShape)
	.refine(hasAnyMealMutation, { message: AT_LEAST_ONE_FIELD_MESSAGE });

/** Body plus route id — what the handler actually receives. */
export const updateMealInputSchema = mealParamsSchema
	.extend(updateMealShape)
	.refine(hasAnyMealMutation, { message: AT_LEAST_ONE_FIELD_MESSAGE });

export type MealItemInput = z.infer<typeof mealItemInputSchema>;
export type ListMealsInput = z.infer<typeof listMealsInputSchema>;
export type CreateMealInput = z.infer<typeof createMealInputSchema>;
export type UpdateMealInput = z.infer<typeof updateMealInputSchema>;

/** Route-param inputs. `GET`, `DELETE` and clone all take only the meal id. */
export type MealParams = z.infer<typeof mealParamsSchema>;
export type GetMealInput = MealParams;
export type DeleteMealInput = MealParams;
export type CloneMealInput = MealParams;
