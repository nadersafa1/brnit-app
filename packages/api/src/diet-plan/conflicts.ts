import { HttpError } from "../http-error";
import {
	findMissingIds,
	findRemoveUpdateConflicts,
} from "../meal/mutation-ids";

/**
 * The refusals `PATCH` / `DELETE /diet-plans/:id` answer with.
 *
 * An **assigned** plan is immutable and undeletable, full stop. Members are
 * eating from it and their consumption rows, meal-time overrides and food
 * swaps all point at its `diet_plan_meal` slots, so editing the structure would
 * retroactively rewrite history that has already been logged. Cloning the plan
 * is the supported way to change one.
 *
 * The messages are surfaced verbatim by the web diet-plan screens.
 */

export const DIET_PLAN_ASSIGNED_EDIT_MESSAGE =
	"Cannot edit a diet plan while it is assigned to a member or user";

export const DIET_PLAN_ASSIGNED_DELETE_MESSAGE =
	"Cannot delete a diet plan while it is assigned to a member or user";

/** 409 when the plan has any assignment. */
export function assertDietPlanEditable(hasAssignments: boolean): void {
	if (hasAssignments) {
		throw new HttpError(409, DIET_PLAN_ASSIGNED_EDIT_MESSAGE);
	}
}

/** 409 when the plan has any assignment. */
export function assertDietPlanDeletable(hasAssignments: boolean): void {
	if (hasAssignments) {
		throw new HttpError(409, DIET_PLAN_ASSIGNED_DELETE_MESSAGE);
	}
}

/**
 * 400 when a `diet_plan_meal` id appears in both `remove` and `update`.
 *
 * Same cross-array ambiguity as on meals; Zod covers duplicates within an
 * array, not across two.
 */
export function assertNoDietPlanMealRemoveUpdateOverlap(
	remove: readonly string[] | undefined,
	updateIds: readonly string[]
): void {
	const conflicts = findRemoveUpdateConflicts(remove, updateIds);
	if (conflicts.length > 0) {
		throw new HttpError(
			400,
			`Diet plan meal(s) cannot appear in both remove and update: ${conflicts.join(", ")}`
		);
	}
}

/**
 * 400 when a referenced slot does not exist on **this** plan.
 *
 * Separate from the query that loads `existingIds` so the two probes can run in
 * parallel while the refusals keep a fixed order — a payload wrong in both ways
 * always reports the slot problem before the meal problem.
 */
export function assertSlotIdsBelongToPlan(
	requestedIds: readonly string[],
	existingIds: readonly string[]
): void {
	const missing = findMissingIds(requestedIds, existingIds);
	if (missing.length > 0) {
		throw new HttpError(
			400,
			`Diet plan meal(s) not found or do not belong to this plan: ${missing.join(", ")}`
		);
	}
}

/** 400 when a meal being scheduled does not exist (`meal_id` is `RESTRICT`). */
export function assertScheduledMealIdsExist(
	requestedIds: readonly string[],
	existingIds: readonly string[]
): void {
	const missing = findMissingIds(requestedIds, existingIds);
	if (missing.length > 0) {
		throw new HttpError(400, `Meal(s) not found: ${missing.join(", ")}`);
	}
}
