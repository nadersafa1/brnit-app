import { HttpError } from "../http-error";
import { findMissingIds, findRemoveUpdateConflicts } from "./mutation-ids";

/**
 * The refusals `PATCH` / `DELETE /meals/:id` answer with, isolated from the
 * database so each one is a decision rather than a query result.
 *
 * The messages are part of the HTTP contract — the web meal table surfaces them
 * verbatim in a toast — so they are exported as constants rather than inlined,
 * and must not be reworded without updating the clients.
 */

/**
 * A meal inside an *assigned* plan is frozen: members are already eating from
 * it, and editing its lines would retroactively rewrite what their plan said.
 */
export const MEAL_IN_ASSIGNED_PLAN_MESSAGE =
	"Cannot edit this meal while it is part of a diet plan assigned to a member or user";

/**
 * `meal_item.food_item_id` is `ON DELETE RESTRICT`, so a meal with lines cannot
 * be deleted anyway — this turns the FK violation into an actionable 409.
 */
export const MEAL_HAS_ITEMS_MESSAGE =
	"Cannot delete a meal that still has meal items; remove them first";

/** `diet_plan_meal.meal_id` is `ON DELETE RESTRICT`; same reasoning. */
export const MEAL_USED_IN_PLAN_MESSAGE =
	"Cannot delete a meal that is used in a diet plan; remove it from the plan first";

/** 409 when the meal belongs to a plan that has **any** assignment. */
export function assertMealNotInAssignedPlan(inAssignedPlan: boolean): void {
	if (inAssignedPlan) {
		throw new HttpError(409, MEAL_IN_ASSIGNED_PLAN_MESSAGE);
	}
}

/** 409 when `meal_item` rows still reference the meal. */
export function assertMealHasNoLineItems(lineItemCount: number): void {
	if (lineItemCount > 0) {
		throw new HttpError(409, MEAL_HAS_ITEMS_MESSAGE);
	}
}

/** 409 when any `diet_plan_meal` slot still points at the meal. */
export function assertMealNotUsedInDietPlan(usedInDietPlan: boolean): void {
	if (usedInDietPlan) {
		throw new HttpError(409, MEAL_USED_IN_PLAN_MESSAGE);
	}
}

/**
 * 400 when a `meal_item` id appears in both `remove` and `update`.
 *
 * Zod already rejects duplicates *within* each array; this is the cross-array
 * case it cannot express.
 */
export function assertNoMealItemRemoveUpdateOverlap(
	remove: readonly string[] | undefined,
	updateIds: readonly string[]
): void {
	const conflicts = findRemoveUpdateConflicts(remove, updateIds);
	if (conflicts.length > 0) {
		throw new HttpError(
			400,
			`Meal item(s) cannot appear in both remove and update: ${conflicts.join(", ")}`
		);
	}
}

/**
 * 400 when a referenced `meal_item` does not exist on **this** meal.
 *
 * Kept separate from the query that loads `existingIds` so the two probes the
 * handler needs can run in parallel while the refusals stay in a fixed order —
 * a payload wrong in both ways always reports the meal-item problem first.
 */
export function assertMealItemIdsBelongToMeal(
	requestedIds: readonly string[],
	existingIds: readonly string[]
): void {
	const missing = findMissingIds(requestedIds, existingIds);
	if (missing.length > 0) {
		throw new HttpError(
			400,
			`Meal item(s) not found or do not belong to this meal: ${missing.join(", ")}`
		);
	}
}

/** 400 when a food being added does not exist (`food_item_id` is `RESTRICT`). */
export function assertMealFoodItemIdsExist(
	requestedIds: readonly string[],
	existingIds: readonly string[]
): void {
	const missing = findMissingIds(requestedIds, existingIds);
	if (missing.length > 0) {
		throw new HttpError(400, `Food item(s) not found: ${missing.join(", ")}`);
	}
}
