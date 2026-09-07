import { z } from "zod";

import {
	pageSchema,
	perPageSchema,
	sortOrderSchema,
} from "../pagination/query-params";

/**
 * Input schemas for meal consumptions — the "I ate this" records.
 *
 * `consumedAt` is an instant, `consumedDate` is the UTC calendar day derived
 * from it, and the unique index on
 * `(assignment, diet_plan_meal, consumed_date)` is what makes a meal loggable
 * once per day.
 *
 * > The clients post `consumedAt` at **12:00 device-local time** precisely so
 * > that slicing it to a UTC date lands on the day the member meant, whatever
 * > their offset. Do not "fix" one side of that convention alone.
 */

const UTC_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CONSUMED_ITEMS = 50;

const utcDateStringSchema = z
	.string()
	.regex(UTC_DATE_PATTERN, "Date must be YYYY-MM-DD");

const pathIdSchema = z.string().min(1);

const consumedItemSchema = z.object({
	foodItemId: z.uuid("Invalid food item ID"),
	quantity: z.number().positive("Quantity must be positive"),
});

export type ConsumedItemInput = z.infer<typeof consumedItemSchema>;

export const createDietPlanMealConsumptionInputSchema = z.object({
	/**
	 * Accepts an ISO string, a `Date`, or anything `Date` can coerce — the web
	 * app sends a `Date`, native sends an ISO string.
	 */
	consumedAt: z
		.union([z.iso.datetime(), z.coerce.date(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
	consumedItems: z
		.array(consumedItemSchema)
		.max(
			MAX_CONSUMED_ITEMS,
			`consumedItems must have at most ${MAX_CONSUMED_ITEMS} entries`
		)
		.optional(),
	dietPlanAssignmentId: z.uuid("Invalid assignment ID"),
	dietPlanMealId: z.uuid("Invalid diet plan meal ID"),
	/**
	 * Snapshot the slot's planned items (override-aware) when no explicit items
	 * are sent. This is how the native "mark as eaten" tap records *what* was
	 * eaten without the client re-deriving the plan.
	 */
	usePlannedItems: z.boolean().optional(),
});

export type CreateDietPlanMealConsumptionInput = z.infer<
	typeof createDietPlanMealConsumptionInputSchema
>;

const consumptionSortBySchema = z
	.enum(["consumedAt", "consumedDate", "createdAt"])
	.optional();

export const dietPlanMealConsumptionListQuerySchema = z.object({
	consumedDateFrom: utcDateStringSchema.optional(),
	consumedDateTo: utcDateStringSchema.optional(),
	dietPlanAssignmentId: z.uuid().optional(),
	page: pageSchema,
	perPage: perPageSchema,
	sortBy: consumptionSortBySchema,
	sortOrder: sortOrderSchema,
});

export type DietPlanMealConsumptionListQuery = z.infer<
	typeof dietPlanMealConsumptionListQuerySchema
>;

/** The member "unmark" flow addresses a consumption by slot, not by id. */
export const deleteDietPlanMealConsumptionBySlotInputSchema = z.object({
	consumedDate: utcDateStringSchema,
	dietPlanAssignmentId: z.uuid("Invalid assignment ID"),
	dietPlanMealId: z.uuid("Invalid diet plan meal ID"),
});

export type DeleteDietPlanMealConsumptionBySlotInput = z.infer<
	typeof deleteDietPlanMealConsumptionBySlotInputSchema
>;

export const dietPlanMealConsumptionIdParamsSchema = z.object({
	id: pathIdSchema,
});

export type DietPlanMealConsumptionIdParams = z.infer<
	typeof dietPlanMealConsumptionIdParamsSchema
>;
