import type { DbClient, DbTransaction } from "@brnit/db";
import { db } from "@brnit/db";
import { dietPlanMeal, dietPlanMealTimeOverride } from "@brnit/db/schema";
import type { MealTimeOverrideRow } from "@brnit/domain";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { HttpError } from "../http-error";
import type { MealTimeOverrideDto } from "./dto";
import type { MealTimeOverrideInput } from "./schemas";

/**
 * Assignment-level meal-time overrides: "breakfast is at 09:00 for *this*
 * client", overriding the plan slot's own `scheduled_time`.
 *
 * Only the **future-only** rows (`effective_date IS NULL`) are writable through
 * the nutritionist endpoints. Exact-date rows exist in the schema and are
 * honoured when resolving a day, but nothing in the current surface creates
 * them, so a save must never touch them.
 *
 * Resolution itself lives in `@brnit/domain` as `resolveMealTimeOverridesForDate`
 * — it is a pure function of (rows, date, today) and is shared with the member
 * Home read.
 */

type MealTimeOverrideClient = DbClient | DbTransaction;

/**
 * Replaces the future-only meal-time overrides for the meals named in
 * `mealTimeOverrides`.
 *
 * An entry with `scheduledTime: null` is a *clear*: its future-only row is
 * deleted and nothing is written back, so the plan default applies again. Meals
 * not named in the payload keep whatever they had. An empty payload is a no-op
 * rather than "delete everything".
 *
 * Runs inside the caller's transaction so an assignment and its times are
 * written atomically. Throws **400** when a meal does not belong to the plan.
 */
export async function saveAssignmentMealTimeOverrides(
	client: MealTimeOverrideClient,
	assignmentId: string,
	dietPlanId: string,
	mealTimeOverrides: readonly MealTimeOverrideInput[]
): Promise<void> {
	if (mealTimeOverrides.length === 0) {
		return;
	}

	const dietPlanMealIds = [
		...new Set(mealTimeOverrides.map((entry) => entry.dietPlanMealId)),
	];

	const planMeals = await client
		.select({ id: dietPlanMeal.id })
		.from(dietPlanMeal)
		.where(
			and(
				eq(dietPlanMeal.dietPlanId, dietPlanId),
				inArray(dietPlanMeal.id, dietPlanMealIds)
			)
		);

	const known = new Set(planMeals.map((row) => row.id));
	const missing = dietPlanMealIds.filter((id) => !known.has(id));
	if (missing.length > 0) {
		throw new HttpError(
			400,
			`Diet plan meal(s) not found or do not belong to assignment plan: ${missing.join(", ")}`
		);
	}

	await client
		.delete(dietPlanMealTimeOverride)
		.where(
			and(
				eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId),
				inArray(dietPlanMealTimeOverride.dietPlanMealId, dietPlanMealIds),
				isNull(dietPlanMealTimeOverride.effectiveDate)
			)
		);

	const inserts = mealTimeOverrides.filter(
		(entry): entry is MealTimeOverrideInput & { scheduledTime: string } =>
			entry.scheduledTime !== null
	);
	if (inserts.length === 0) {
		return;
	}

	await client.insert(dietPlanMealTimeOverride).values(
		inserts.map((entry) => ({
			dietPlanAssignmentId: assignmentId,
			dietPlanMealId: entry.dietPlanMealId,
			effectiveDate: null,
			scheduledTime: entry.scheduledTime,
		}))
	);
}

/** Future-only rows for one assignment, in the shape the DTOs expect. */
export async function listFutureMealTimeOverrides(
	assignmentId: string
): Promise<MealTimeOverrideDto[]> {
	return await db
		.select({
			dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
			scheduledTime: dietPlanMealTimeOverride.scheduledTime,
		})
		.from(dietPlanMealTimeOverride)
		.where(
			and(
				eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId),
				isNull(dietPlanMealTimeOverride.effectiveDate)
			)
		);
}

/** Groups future-only rows for a page of assignments; one query, grouped in memory. */
export function groupFutureMealTimeOverridesByAssignment(
	rows: readonly {
		dietPlanAssignmentId: string;
		dietPlanMealId: string;
		scheduledTime: string;
	}[]
): Map<string, MealTimeOverrideDto[]> {
	const grouped = new Map<string, MealTimeOverrideDto[]>();
	for (const row of rows) {
		const list = grouped.get(row.dietPlanAssignmentId) ?? [];
		list.push({
			dietPlanMealId: row.dietPlanMealId,
			scheduledTime: row.scheduledTime,
		});
		grouped.set(row.dietPlanAssignmentId, list);
	}
	return grouped;
}

/** Future-only rows for many assignments at once, for the paginated list read. */
export async function listFutureMealTimeOverridesForAssignments(
	assignmentIds: readonly string[]
): Promise<Map<string, MealTimeOverrideDto[]>> {
	if (assignmentIds.length === 0) {
		return new Map();
	}
	const rows = await db
		.select({
			dietPlanAssignmentId: dietPlanMealTimeOverride.dietPlanAssignmentId,
			dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
			scheduledTime: dietPlanMealTimeOverride.scheduledTime,
		})
		.from(dietPlanMealTimeOverride)
		.where(
			and(
				inArray(dietPlanMealTimeOverride.dietPlanAssignmentId, [
					...assignmentIds,
				]),
				isNull(dietPlanMealTimeOverride.effectiveDate)
			)
		);
	return groupFutureMealTimeOverridesByAssignment(rows);
}

/**
 * Every meal-time row for an assignment — exact-date and future-only alike —
 * ready for `resolveMealTimeOverridesForDate`.
 */
export async function listMealTimeOverrideRows(
	assignmentId: string
): Promise<MealTimeOverrideRow[]> {
	return await db
		.select({
			dietPlanMealId: dietPlanMealTimeOverride.dietPlanMealId,
			effectiveDate: dietPlanMealTimeOverride.effectiveDate,
			scheduledTime: dietPlanMealTimeOverride.scheduledTime,
		})
		.from(dietPlanMealTimeOverride)
		.where(eq(dietPlanMealTimeOverride.dietPlanAssignmentId, assignmentId));
}
