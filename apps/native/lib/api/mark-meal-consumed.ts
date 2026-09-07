import type { DietPlanMealConsumptionDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export interface MarkMealConsumedParams {
	/**
	 * The instant the meal was eaten, sent as **12:00 device-local** so the
	 * server's UTC `consumedAt.slice(0, 10)` lands on the day the member picked.
	 * Build it with `localDateStringToNoonInstant`.
	 */
	consumedAt: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}

/**
 * Marks a meal eaten. `usePlannedItems` lets the server snapshot the slot's
 * planned items (override-aware) instead of the client re-sending them.
 */
export function markMealConsumed(
	params: MarkMealConsumedParams,
	options?: Pick<ApiFetchOptions, "signal">
): Promise<{ data: DietPlanMealConsumptionDto }> {
	const body = {
		consumedAt: params.consumedAt,
		dietPlanAssignmentId: params.dietPlanAssignmentId,
		dietPlanMealId: params.dietPlanMealId,
		usePlannedItems: true,
	};
	return apiFetch<{ data: DietPlanMealConsumptionDto }>(
		API_ENDPOINTS.member.dietPlanMealConsumptions,
		{ method: "POST", body, signal: options?.signal }
	);
}
