import { z } from "zod";

import {
	paginationQuerySchema,
	sortQuerySchema,
	textSearchQuerySchema,
} from "../pagination/query-params";

/**
 * Input contract for the diet-plan endpoints, mounted identically under
 * `/admin/diet-plans` and `/nutritionist/diet-plans`.
 *
 * Route ids are `z.string().min(1)` for the same reason as meals: the id
 * columns are plain `text`, and an unknown id must answer 404, not 400.
 */

const NAME_MAX_LENGTH = 255;
const DESCRIPTION_MAX_LENGTH = 500;
const MEAL_TYPE_MAX_LENGTH = 50;

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const planNameSchema = z
	.string()
	.min(1, "Name is required")
	.max(NAME_MAX_LENGTH, "Name must be less than 255 characters");

/**
 * `diet_plan_meal.day_number`.
 *
 * `0` means the slot repeats on **every** day of the plan; `>= 1` pins it to
 * that day (Day 1 is the assignment's `start_date`). Zero is therefore a
 * meaningful value, not an empty one.
 */
export const dayNumberSchema = z
	.number()
	.int()
	.min(0, "Day number must be 0 (all days) or a positive integer");

/**
 * `diet_plan_meal.scheduled_time` — `HH:mm` stored as **text**, not a `time`
 * column, so the wire format is validated here rather than by Postgres.
 */
export const timeOfDaySchema = z
	.string()
	.regex(HH_MM_PATTERN, "Time must be HH:mm");

/**
 * `meal_type` is free text (breakfast, "pre-workout", …), not an enum — the
 * column has no constraint and nutritionists name slots however they like.
 */
const mealTypeSchema = z
	.string()
	.min(1, "Meal type is required")
	.max(MEAL_TYPE_MAX_LENGTH, "Meal type must be less than 50 characters");

const mealOrderSchema = z
	.number()
	.int()
	.positive("Meal order must be a positive integer");

export const dietPlanMealInputSchema = z.object({
	dayNumber: dayNumberSchema,
	mealId: z.uuid("Invalid meal ID"),
	mealOrder: mealOrderSchema.default(1),
	mealType: mealTypeSchema,
	scheduledTime: timeOfDaySchema.optional(),
});

export const dietPlanParamsSchema = z.object({
	dietPlanId: z.string().min(1),
});

export const listDietPlansInputSchema = z.object({
	...paginationQuerySchema.shape,
	...textSearchQuerySchema.shape,
	...sortQuerySchema.shape,
	sortBy: z.enum(["name", "createdAt"]).optional(),
});

export const createDietPlanInputSchema = z.object({
	description: z.string().max(DESCRIPTION_MAX_LENGTH).optional(),
	dietPlanMeals: z.array(dietPlanMealInputSchema).optional().default([]),
	name: planNameSchema,
});

const addDietPlanMealSchema = z.object({
	dayNumber: dayNumberSchema,
	mealId: z.uuid("Invalid meal ID"),
	mealOrder: mealOrderSchema.optional().default(1),
	mealType: mealTypeSchema,
	scheduledTime: timeOfDaySchema.optional(),
});

const updateDietPlanMealSchema = z.object({
	dayNumber: dayNumberSchema.optional(),
	dietPlanMealId: z.uuid("Invalid diet plan meal ID"),
	mealId: z.uuid("Invalid meal ID").optional(),
	mealOrder: mealOrderSchema.optional(),
	mealType: mealTypeSchema.optional(),
	scheduledTime: timeOfDaySchema.nullable().optional(),
});

/**
 * Two `add` entries describing the same slot *and* the same meal are a
 * duplicate; the same slot with a **different** meal is not — that is how a
 * plan offers alternatives for one meal of the day.
 */
const addArraySchema = z
	.array(addDietPlanMealSchema)
	.refine(
		(arr) =>
			new Set(
				arr.map(
					(x) => `${x.dayNumber}-${x.mealType}-${x.mealOrder}-${x.mealId}`
				)
			).size === arr.length,
		{
			message:
				"Duplicate diet plan meal (same dayNumber, mealType, mealOrder, mealId) in add array",
		}
	);

const removeArraySchema = z
	.array(z.uuid("Invalid diet plan meal ID"))
	.refine((arr) => new Set(arr).size === arr.length, {
		message: "Duplicate dietPlanMealId in remove array",
	});

const updateArraySchema = z
	.array(updateDietPlanMealSchema)
	.refine(
		(arr) => new Set(arr.map((x) => x.dietPlanMealId)).size === arr.length,
		{ message: "Duplicate dietPlanMealId in update array" }
	);

const updateDietPlanShape = {
	add: addArraySchema.optional(),
	description: z.string().max(DESCRIPTION_MAX_LENGTH).nullable().optional(),
	name: planNameSchema.optional(),
	remove: removeArraySchema.optional(),
	update: updateArraySchema.optional(),
};

const AT_LEAST_ONE_FIELD_MESSAGE =
	"At least one of name, description, add, remove, or update must be provided";

function hasAnyDietPlanMutation(value: {
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

/** Request body for `PATCH /diet-plans/:id`, before the route id is folded in. */
export const updateDietPlanBodySchema = z
	.object(updateDietPlanShape)
	.refine(hasAnyDietPlanMutation, { message: AT_LEAST_ONE_FIELD_MESSAGE });

/** Body plus route id — what the handler actually receives. */
export const updateDietPlanInputSchema = dietPlanParamsSchema
	.extend(updateDietPlanShape)
	.refine(hasAnyDietPlanMutation, { message: AT_LEAST_ONE_FIELD_MESSAGE });

export type DietPlanMealInput = z.infer<typeof dietPlanMealInputSchema>;
export type UpdateDietPlanMealInput = z.infer<typeof updateDietPlanMealSchema>;
export type ListDietPlansInput = z.infer<typeof listDietPlansInputSchema>;
export type CreateDietPlanInput = z.infer<typeof createDietPlanInputSchema>;
export type UpdateDietPlanInput = z.infer<typeof updateDietPlanInputSchema>;

/** Route-param inputs. `GET` and `DELETE` take only the plan id. */
export type DietPlanParams = z.infer<typeof dietPlanParamsSchema>;
export type GetDietPlanInput = DietPlanParams;
export type DeleteDietPlanInput = DietPlanParams;
