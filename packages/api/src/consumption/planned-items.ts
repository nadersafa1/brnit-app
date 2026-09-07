import { db } from "@brnit/db";
import { dietPlanAssignment, dietPlanMeal, mealItem } from "@brnit/db/schema";
import { overrideSlotKey, resolveOverridesForDate } from "@brnit/domain";
import { and, asc, eq } from "drizzle-orm";

import { listMealItemOverrideRows } from "../assignment/meal-item-overrides";

/**
 * What the plan says a member should eat for one slot on one day.
 *
 * A consumption stores a *snapshot* of items, not a pointer to the plan, so that
 * later edits to the plan (or to a food swap) never rewrite what somebody is
 * recorded as having eaten. This resolves that snapshot the same way the member
 * Home read resolves what to display: the plan's meal items, with any override
 * covering that day substituted in.
 */

export interface PlannedConsumptionItem {
	foodItemId: string;
	quantity: number;
}

/**
 * Returns `null` when the slot cannot be resolved — the assignment is gone, the
 * plan meal is not part of the assignment's plan, or the meal has no items. All
 * three are `INVALID_SLOT` to the caller: there is nothing meaningful to log.
 */
export async function resolvePlannedItemsForSlot(
	assignmentId: string,
	dietPlanMealId: string,
	consumedDate: string
): Promise<PlannedConsumptionItem[] | null> {
	const [assignment] = await db
		.select({ dietPlanId: dietPlanAssignment.dietPlanId })
		.from(dietPlanAssignment)
		.where(eq(dietPlanAssignment.id, assignmentId))
		.limit(1);
	if (!assignment) {
		return null;
	}

	const [planMeal] = await db
		.select({ mealId: dietPlanMeal.mealId })
		.from(dietPlanMeal)
		.where(
			and(
				eq(dietPlanMeal.id, dietPlanMealId),
				eq(dietPlanMeal.dietPlanId, assignment.dietPlanId)
			)
		)
		.limit(1);
	if (!planMeal) {
		return null;
	}

	const [plannedItems, overrideRows] = await Promise.all([
		db
			.select({
				foodItemId: mealItem.foodItemId,
				id: mealItem.id,
				quantity: mealItem.quantity,
			})
			.from(mealItem)
			.where(eq(mealItem.mealId, planMeal.mealId))
			.orderBy(asc(mealItem.createdAt)),
		listMealItemOverrideRows(assignmentId, dietPlanMealId),
	]);

	if (plannedItems.length === 0) {
		return null;
	}

	const overrides = resolveOverridesForDate(overrideRows, consumedDate);

	return plannedItems.map((item) => {
		const override = overrides.get(overrideSlotKey(dietPlanMealId, item.id));
		if (override) {
			return {
				foodItemId: override.foodItemId,
				quantity: Number(override.quantity),
			};
		}
		return { foodItemId: item.foodItemId, quantity: Number(item.quantity) };
	});
}
