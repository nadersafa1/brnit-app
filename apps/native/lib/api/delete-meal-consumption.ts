import type { DeletedFlagDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export interface DeleteMealConsumptionParams {
	consumedDate: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
}

/** Unmark: the payload names the slot and the day, never a consumption id. */
export function deleteMealConsumption(
	params: DeleteMealConsumptionParams,
	options?: Pick<ApiFetchOptions, "signal">
): Promise<{ data: DeletedFlagDto }> {
	const body = {
		consumedDate: params.consumedDate,
		dietPlanAssignmentId: params.dietPlanAssignmentId,
		dietPlanMealId: params.dietPlanMealId,
	};
	return apiFetch<{ data: DeletedFlagDto }>(
		API_ENDPOINTS.member.dietPlanMealConsumptions,
		{ method: "DELETE", body, signal: options?.signal }
	);
}
