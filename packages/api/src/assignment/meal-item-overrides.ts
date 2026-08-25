import { db } from "@brnit/db";
import {
	dietPlanMeal,
	dietPlanMealItemOverride,
	foodItem,
	mealItem,
} from "@brnit/db/schema";
import type { MealItemOverrideSlotRow } from "@brnit/domain";
import { and, desc, eq, type SQL, sql } from "drizzle-orm";

import { HttpError } from "../http-error";
import type { OwnedAssignment } from "./access";
import {
	findOverrideRowCoveringDate,
	mergeEffectiveDates,
	parseEffectiveDates,
	removeDateFromEffectiveDates,
} from "./override-dates";
import type { MealItemOverrideScope } from "./schemas";

/**
 * Persistence for meal-item overrides — the member's food swaps.
 *
 * The model is **several rows per slot**, one per alternative food, each owning
 * a mutable set of `effective_dates`. That is what lets chicken cover Monday and
 * fish cover Tuesday in the same line of the same meal. A unique index on
 * `(assignment, meal, meal_item, food_item)` keeps one row per food, and
 * resolution for a day picks the covering row with the greatest `updated_at`
 * (`resolveOverridesForDate` in `@brnit/domain`).
 */

const OVERRIDE_NOT_FOUND = "Override not found";

export interface MealItemOverrideSlot {
	assignmentId: string;
	dietPlanMealId: string;
	mealItemId: string;
}

/** A row shaped for `resolveOverridesForDate`, plus what the readers render. */
export interface MealItemOverrideResolutionRow extends MealItemOverrideSlotRow {
	foodItemId: string;
	foodName: string;
	quantity: string;
}

export type MealItemOverrideRecord =
	typeof dietPlanMealItemOverride.$inferSelect;

function slotCondition(slot: MealItemOverrideSlot): SQL<unknown> | undefined {
	return and(
		eq(dietPlanMealItemOverride.dietPlanAssignmentId, slot.assignmentId),
		eq(dietPlanMealItemOverride.dietPlanMealId, slot.dietPlanMealId),
		eq(dietPlanMealItemOverride.mealItemId, slot.mealItemId)
	);
}

/** `effective_dates @> '["2026-04-08"]'` — index-friendly containment test. */
function coversDateCondition(date: string): SQL<unknown> {
	return sql`${dietPlanMealItemOverride.effectiveDates} @> ${JSON.stringify([date])}::jsonb`;
}

/**
 * Validates that a slot exists within the assignment's plan and that the
 * replacement food is real.
 *
 * Order matters: the plan meal and the food are independent reads and run
 * together, but the meal item can only be checked once the plan meal has yielded
 * its `mealId`. The statuses differ on purpose — a bad slot is a 404 (the URL
 * names something that is not there), a bad food is a 400 (the body is wrong).
 */
export async function requireOverrideSlot(params: {
	assignment: OwnedAssignment;
	dietPlanMealId: string;
	foodItemId?: string;
	mealItemId?: string;
}): Promise<void> {
	const [planMealRows, foodRows] = await Promise.all([
		db
			.select({ id: dietPlanMeal.id, mealId: dietPlanMeal.mealId })
			.from(dietPlanMeal)
			.where(
				and(
					eq(dietPlanMeal.id, params.dietPlanMealId),
					eq(dietPlanMeal.dietPlanId, params.assignment.dietPlanId)
				)
			)
			.limit(1),
		params.foodItemId === undefined
			? Promise.resolve([])
			: db
					.select({ id: foodItem.id })
					.from(foodItem)
					.where(eq(foodItem.id, params.foodItemId))
					.limit(1),
	]);

	const planMeal = planMealRows[0];
	if (!planMeal) {
		throw new HttpError(
			404,
			"Diet plan meal not found or does not belong to this assignment"
		);
	}
	if (params.foodItemId !== undefined && !foodRows[0]) {
		throw new HttpError(400, "Food item not found");
	}
	if (params.mealItemId === undefined) {
		return;
	}

	const mealItemRows = await db
		.select({ id: mealItem.id })
		.from(mealItem)
		.where(
			and(
				eq(mealItem.id, params.mealItemId),
				eq(mealItem.mealId, planMeal.mealId)
			)
		)
		.limit(1);
	if (!mealItemRows[0]) {
		throw new HttpError(
			404,
			"Meal item not found or does not belong to this diet plan meal"
		);
	}
}

/**
 * Override rows for an assignment, optionally narrowed to one plan meal.
 *
 * `effectiveDates` is normalized on the way out so resolution never has to
 * defend against a malformed `jsonb` payload.
 */
export async function listMealItemOverrideRows(
	assignmentId: string,
	dietPlanMealId?: string
): Promise<MealItemOverrideResolutionRow[]> {
	const rows = await db
		.select({
			dietPlanMealId: dietPlanMealItemOverride.dietPlanMealId,
			effectiveDates: dietPlanMealItemOverride.effectiveDates,
			foodItemId: dietPlanMealItemOverride.foodItemId,
			foodName: foodItem.name,
			mealItemId: dietPlanMealItemOverride.mealItemId,
			quantity: dietPlanMealItemOverride.quantity,
			updatedAt: dietPlanMealItemOverride.updatedAt,
		})
		.from(dietPlanMealItemOverride)
		.innerJoin(foodItem, eq(dietPlanMealItemOverride.foodItemId, foodItem.id))
		.where(
			and(
				eq(dietPlanMealItemOverride.dietPlanAssignmentId, assignmentId),
				dietPlanMealId === undefined
					? undefined
					: eq(dietPlanMealItemOverride.dietPlanMealId, dietPlanMealId)
			)
		);

	return rows.map((row) => ({
		...row,
		effectiveDates: parseEffectiveDates(row.effectiveDates),
	}));
}

export interface UpsertMealItemOverrideParams {
	effectiveDates: string[];
	foodItemId: string;
	intentScope: MealItemOverrideScope;
	intentStartDate: string;
	/** When set, edits that exact row instead of the slot's row for this food. */
	overrideId?: string;
	quantity: number;
	slot: MealItemOverrideSlot;
}

export interface UpsertMealItemOverrideOutcome {
	created: boolean;
	row: MealItemOverrideRecord;
}

/**
 * Writes one override row.
 *
 * Three paths, and the difference between them is the whole feature:
 * - **`overrideId` given** — edit that row and *replace* its dates. The caller
 *   is editing a specific alternative they can see, so their new window is the
 *   truth.
 * - **row already exists for this slot+food** — *merge* the date sets. The
 *   caller asked for "this food on this day" without knowing the row exists;
 *   clobbering would silently un-swap the days it already covered.
 * - **no row** — insert.
 *
 * Read-then-write runs in one transaction so two concurrent swaps of the same
 * slot cannot both read "absent" and race into the unique index.
 */
export async function upsertMealItemOverrideRow(
	params: UpsertMealItemOverrideParams
): Promise<UpsertMealItemOverrideOutcome> {
	const {
		effectiveDates,
		foodItemId: nextFoodItemId,
		intentScope,
		intentStartDate,
		overrideId,
		quantity,
		slot,
	} = params;

	return await db.transaction(async (tx) => {
		const scoped = slotCondition(slot);

		if (overrideId) {
			const [existingById] = await tx
				.select()
				.from(dietPlanMealItemOverride)
				.where(and(scoped, eq(dietPlanMealItemOverride.id, overrideId)))
				.limit(1);
			if (!existingById) {
				throw new HttpError(404, OVERRIDE_NOT_FOUND);
			}

			const [updated] = await tx
				.update(dietPlanMealItemOverride)
				.set({
					effectiveDates,
					foodItemId: nextFoodItemId,
					intentScope,
					intentStartDate,
					quantity: String(quantity),
				})
				.where(eq(dietPlanMealItemOverride.id, existingById.id))
				.returning();
			if (!updated) {
				throw new HttpError(400, "Failed to save override");
			}
			return { created: false, row: updated };
		}

		const [existing] = await tx
			.select()
			.from(dietPlanMealItemOverride)
			.where(
				and(scoped, eq(dietPlanMealItemOverride.foodItemId, nextFoodItemId))
			)
			.limit(1);

		if (existing) {
			const [updated] = await tx
				.update(dietPlanMealItemOverride)
				.set({
					effectiveDates: mergeEffectiveDates(
						parseEffectiveDates(existing.effectiveDates),
						effectiveDates
					),
					intentScope,
					intentStartDate,
					quantity: String(quantity),
				})
				.where(eq(dietPlanMealItemOverride.id, existing.id))
				.returning();
			if (!updated) {
				throw new HttpError(400, "Failed to save override");
			}
			return { created: false, row: updated };
		}

		const [created] = await tx
			.insert(dietPlanMealItemOverride)
			.values({
				dietPlanAssignmentId: slot.assignmentId,
				dietPlanMealId: slot.dietPlanMealId,
				effectiveDates,
				foodItemId: nextFoodItemId,
				intentScope,
				intentStartDate,
				mealItemId: slot.mealItemId,
				quantity: String(quantity),
			})
			.returning();
		if (!created) {
			throw new HttpError(400, "Failed to save override");
		}
		return { created: true, row: created };
	});
}

/** Clears every override row in a slot. Throws **404** when there was none. */
export async function deleteMealItemOverrideSlot(
	slot: MealItemOverrideSlot
): Promise<void> {
	const deleted = await db
		.delete(dietPlanMealItemOverride)
		.where(slotCondition(slot))
		.returning({ id: dietPlanMealItemOverride.id });
	if (deleted.length === 0) {
		throw new HttpError(404, OVERRIDE_NOT_FOUND);
	}
}

/**
 * Removes a single day from the slot.
 *
 * Newest row first, so the day is taken from whichever override actually
 * resolves on it; the row itself is deleted once its date set empties, because
 * an override covering no day is unreachable. Throws **404** when no row covers
 * the day.
 */
export async function deleteMealItemOverrideDate(
	slot: MealItemOverrideSlot,
	date: string
): Promise<void> {
	await db.transaction(async (tx) => {
		const rows = await tx
			.select({
				effectiveDates: dietPlanMealItemOverride.effectiveDates,
				id: dietPlanMealItemOverride.id,
			})
			.from(dietPlanMealItemOverride)
			.where(slotCondition(slot))
			.orderBy(desc(dietPlanMealItemOverride.updatedAt));

		const target = findOverrideRowCoveringDate(rows, date);
		if (!target) {
			throw new HttpError(404, OVERRIDE_NOT_FOUND);
		}

		const remaining = removeDateFromEffectiveDates(
			parseEffectiveDates(target.effectiveDates),
			date
		);
		if (remaining === null) {
			throw new HttpError(404, OVERRIDE_NOT_FOUND);
		}

		if (remaining.length === 0) {
			await tx
				.delete(dietPlanMealItemOverride)
				.where(eq(dietPlanMealItemOverride.id, target.id));
			return;
		}

		await tx
			.update(dietPlanMealItemOverride)
			.set({ effectiveDates: remaining })
			.where(eq(dietPlanMealItemOverride.id, target.id));
	});
}

export interface DisplayedMealItem {
	foodItemId: string;
	quantity: number;
}

/**
 * What a slot actually shows on `date`: the covering override with the greatest
 * `updated_at`, else the plan's own meal item.
 *
 * The food-item alternatives endpoint resolves the *displayed* food and quantity
 * through this before running its matching algorithm, so swapping twice in a day
 * keeps offering alternatives to what the member currently sees.
 */
export async function resolveDisplayedMealItemForDate(params: {
	assignment: OwnedAssignment;
	date: string;
	dietPlanMealId: string;
	mealItemId: string;
}): Promise<DisplayedMealItem> {
	const slot: MealItemOverrideSlot = {
		assignmentId: params.assignment.id,
		dietPlanMealId: params.dietPlanMealId,
		mealItemId: params.mealItemId,
	};

	const [planMealRows, overrideRows] = await Promise.all([
		db
			.select({ mealId: dietPlanMeal.mealId })
			.from(dietPlanMeal)
			.where(
				and(
					eq(dietPlanMeal.id, params.dietPlanMealId),
					eq(dietPlanMeal.dietPlanId, params.assignment.dietPlanId)
				)
			)
			.limit(1),
		db
			.select({
				foodItemId: dietPlanMealItemOverride.foodItemId,
				quantity: dietPlanMealItemOverride.quantity,
			})
			.from(dietPlanMealItemOverride)
			.where(and(slotCondition(slot), coversDateCondition(params.date)))
			.orderBy(desc(dietPlanMealItemOverride.updatedAt))
			.limit(1),
	]);

	const planMeal = planMealRows[0];
	if (!planMeal) {
		throw new HttpError(
			404,
			"Diet plan meal not found or does not belong to this assignment"
		);
	}

	const [planItem] = await db
		.select({
			foodItemId: mealItem.foodItemId,
			quantity: mealItem.quantity,
		})
		.from(mealItem)
		.where(
			and(
				eq(mealItem.id, params.mealItemId),
				eq(mealItem.mealId, planMeal.mealId)
			)
		)
		.limit(1);
	if (!planItem) {
		throw new HttpError(
			404,
			"Meal item not found or does not belong to this diet plan meal"
		);
	}

	const override = overrideRows[0];
	if (override) {
		return {
			foodItemId: override.foodItemId,
			quantity: Number(override.quantity),
		};
	}
	return {
		foodItemId: planItem.foodItemId,
		quantity: Number(planItem.quantity),
	};
}
