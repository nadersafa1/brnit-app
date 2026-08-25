import { z } from "zod";

import {
	pageSchema,
	perPageSchema,
	sortOrderSchema,
	textSearchSchema,
} from "../pagination/query-params";

/**
 * Input schemas for diet-plan assignments, their meal-time overrides, and the
 * member-facing meal-item overrides (food swaps).
 *
 * These are the *wire* shapes: the web and native clients import them to type
 * their payloads, so every field name and every message here is part of the
 * contract. Path parameters are validated separately from bodies — the way the
 * pre-overhaul route handlers did — and handlers take the merged type.
 */

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_MINUTE_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * A UTC calendar date, `'YYYY-MM-DD'`. Dates stay strings end to end — Drizzle
 * reads `date` columns as strings and the clients send and expect strings.
 */
export const utcDateStringSchema = z
	.string()
	.regex(UTC_DATE_PATTERN, "Date must be YYYY-MM-DD");

/**
 * `member.id` and `user.id` are better-auth text ids, **not** uuids, so they get
 * a length check rather than `z.uuid()`. Plan, meal and food ids are generated
 * with `crypto.randomUUID()` and keep their uuid validation.
 */
const entityIdSchema = z.string().min(1, "ID is required");

/** Route path segments are opaque ids; only emptiness is worth rejecting. */
const pathIdSchema = z.string().min(1);

// ---------------------------------------------------------------------------
// Assignment-level meal-time overrides
// ---------------------------------------------------------------------------

/**
 * One meal-time override entry.
 *
 * `scheduledTime: null` is not "no change" — it means *clear* the override for
 * that meal so the plan slot's own `scheduledTime` applies again. The save path
 * deletes the future-only rows for every listed meal and re-inserts only the
 * non-null ones.
 */
export const mealTimeOverrideInputSchema = z.object({
	dietPlanMealId: z.uuid("Invalid diet plan meal ID"),
	scheduledTime: z
		.string()
		.regex(HOUR_MINUTE_PATTERN, "Time must be HH:mm")
		.nullable(),
});

export type MealTimeOverrideInput = z.infer<typeof mealTimeOverrideInputSchema>;

const mealTimeOverridesArraySchema = z
	.array(mealTimeOverrideInputSchema)
	.refine(
		(entries) =>
			new Set(entries.map((entry) => entry.dietPlanMealId)).size ===
			entries.length,
		{ message: "Duplicate dietPlanMealId in mealTimeOverrides" }
	);

// ---------------------------------------------------------------------------
// Assignment CRUD
// ---------------------------------------------------------------------------

const assignmentSortBySchema = z
	.enum(["startDate", "endDate", "createdAt"])
	.optional();

/**
 * List query. `q` is accepted and ignored — the pre-overhaul schema declared it
 * and the clients may still send it, but no assignment column is searchable.
 */
export const dietPlanAssignmentListQuerySchema = z.object({
	dietPlanId: z.uuid().optional(),
	memberId: entityIdSchema.optional(),
	page: pageSchema,
	perPage: perPageSchema,
	q: textSearchSchema,
	sortBy: assignmentSortBySchema,
	sortOrder: sortOrderSchema,
	userId: entityIdSchema.optional(),
});

export type DietPlanAssignmentListQuery = z.infer<
	typeof dietPlanAssignmentListQuerySchema
>;

const createAssignmentShape = {
	dietPlanId: z.uuid("Invalid diet plan ID"),
	endDate: utcDateStringSchema,
	mealTimeOverrides: mealTimeOverridesArraySchema.optional(),
	startDate: utcDateStringSchema,
};

const startBeforeEnd = {
	message: "Start date must be before or equal to end date",
	path: ["endDate"],
};

/**
 * Nutritionist create payload: `memberId` is mandatory and `userId` is not part
 * of the shape. The handler re-asserts both rules against the resolved
 * organization, because the assignee columns are an XOR at the database level.
 */
export const createDietPlanAssignmentNutritionistInputSchema = z
	.object({ ...createAssignmentShape, memberId: entityIdSchema })
	.refine((value) => value.startDate <= value.endDate, startBeforeEnd);

export type CreateDietPlanAssignmentNutritionistInput = z.infer<
	typeof createDietPlanAssignmentNutritionistInputSchema
>;

/**
 * What the create handler accepts. Broader than the nutritionist wire schema so
 * the org rules of §8.3 (member required, user forbidden) stay expressible and
 * testable rather than being an unreachable branch.
 */
export interface CreateDietPlanAssignmentInput {
	dietPlanId: string;
	endDate: string;
	mealTimeOverrides?: MealTimeOverrideInput[];
	memberId?: string;
	/** Resolved from the caller's active organization, never from the body. */
	organizationId?: string;
	startDate: string;
	userId?: string;
}

export const updateDietPlanAssignmentBodySchema = z
	.object({
		endDate: utcDateStringSchema.optional(),
		mealTimeOverrides: mealTimeOverridesArraySchema.optional(),
		startDate: utcDateStringSchema.optional(),
	})
	.refine((value) => {
		if (value.startDate !== undefined && value.endDate !== undefined) {
			return value.startDate <= value.endDate;
		}
		return true;
	}, startBeforeEnd)
	.refine(
		(value) =>
			value.startDate !== undefined ||
			value.endDate !== undefined ||
			value.mealTimeOverrides !== undefined,
		{
			message:
				"At least one of startDate, endDate, or mealTimeOverrides must be provided",
		}
	);

export type UpdateDietPlanAssignmentBody = z.infer<
	typeof updateDietPlanAssignmentBodySchema
>;

export const dietPlanAssignmentIdParamsSchema = z.object({
	id: pathIdSchema,
});

export type DietPlanAssignmentIdParams = z.infer<
	typeof dietPlanAssignmentIdParamsSchema
>;

export type UpdateDietPlanAssignmentInput = DietPlanAssignmentIdParams &
	UpdateDietPlanAssignmentBody;

// ---------------------------------------------------------------------------
// Meal-item overrides (member food swaps)
// ---------------------------------------------------------------------------

export const mealItemOverrideScopeSchema = z.enum([
	"single_day",
	"rest_of_plan",
]);

export type MealItemOverrideScope = z.infer<typeof mealItemOverrideScopeSchema>;

const overrideBaseShape = {
	foodItemId: z.uuid("Invalid food item ID"),
	/** Targets one concrete row in the slot; without it the slot+food row wins. */
	overrideId: z.uuid("Invalid override ID").optional(),
	quantity: z.number().positive("Quantity must be positive"),
};

/**
 * Both scopes carry only a `startDate`; the end of the window is derived.
 * `.strict()` is load-bearing — it is what rejects the retired `endDate` /
 * `fromDate` / `scope: "period"` payloads instead of silently ignoring them.
 */
const singleDayOverrideSchema = z
	.object({
		...overrideBaseShape,
		scope: z.literal("single_day"),
		startDate: utcDateStringSchema,
	})
	.strict();

const restOfPlanOverrideSchema = z
	.object({
		...overrideBaseShape,
		scope: z.literal("rest_of_plan"),
		startDate: utcDateStringSchema,
	})
	.strict();

export const setMealItemOverrideBodySchema = z.union([
	singleDayOverrideSchema,
	restOfPlanOverrideSchema,
]);

export type SetMealItemOverrideBody = z.infer<
	typeof setMealItemOverrideBodySchema
>;

/** The slot a food swap occupies: one line of one meal of one assignment. */
export const mealItemOverrideParamsSchema = z.object({
	assignmentId: pathIdSchema,
	dietPlanMealId: pathIdSchema,
	mealItemId: pathIdSchema,
});

export type MealItemOverrideParams = z.infer<
	typeof mealItemOverrideParamsSchema
>;

export type SetMealItemOverrideInput = MealItemOverrideParams &
	SetMealItemOverrideBody;

export type DeleteMealItemOverrideInput = MealItemOverrideParams & {
	/** Omitted clears the whole slot; present removes just that day. */
	date?: string;
};
