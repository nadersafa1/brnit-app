import type { MealItemOverrideSlot } from "@/lib/helpers/overridden-meal-slots";
import { deleteMealItemOverride } from "./delete-meal-item-override";
import { ApiError } from "./types";

export interface UndoMealAlternativesForDayParams {
	assignmentId: string;
	date: string;
	slots: MealItemOverrideSlot[];
}

/** 404 = override already gone for that day; safe to ignore when batching undos. */
function isIgnorableUndoDeleteFailure(reason: unknown): boolean {
	return reason instanceof ApiError && reason.status === 404;
}

function firstNonIgnorableFailure(
	results: PromiseSettledResult<unknown>[]
): unknown | null {
	for (const result of results) {
		if (result.status === "fulfilled") {
			continue;
		}
		if (isIgnorableUndoDeleteFailure(result.reason)) {
			continue;
		}
		return result.reason;
	}
	return null;
}

/**
 * Removes meal-item overrides for the given calendar date only (parallel DELETEs).
 * Partial 404s are ignored; any other failure fails the whole operation.
 */
export async function undoMealAlternativesForDay(
	params: UndoMealAlternativesForDayParams
): Promise<void> {
	if (params.slots.length === 0) {
		return;
	}

	const results = await Promise.allSettled(
		params.slots.map((slot) =>
			deleteMealItemOverride({
				assignmentId: params.assignmentId,
				dietPlanMealId: slot.dietPlanMealId,
				mealItemId: slot.mealItemId,
				forDate: params.date,
			})
		)
	);

	const failure = firstNonIgnorableFailure(results);
	if (failure != null) {
		throw failure instanceof Error
			? failure
			: new Error("Could not undo all swaps for this day");
	}
}
