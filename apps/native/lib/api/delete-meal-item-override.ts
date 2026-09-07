import type { DeletedFlagDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export interface DeleteMealItemOverrideParams {
	assignmentId: string;
	dietPlanMealId: string;
	/** Removes only this date from the override row; otherwise clears the whole slot. */
	forDate?: string;
	mealItemId: string;
}

export function deleteMealItemOverride(
	params: DeleteMealItemOverrideParams,
	options?: Pick<ApiFetchOptions, "signal">
): Promise<{ data: DeletedFlagDto }> {
	const { assignmentId, dietPlanMealId, mealItemId, forDate } = params;
	const path = API_ENDPOINTS.member.mealItemOverride(
		assignmentId,
		dietPlanMealId,
		mealItemId
	);
	const searchParams = new URLSearchParams();
	if (forDate) {
		searchParams.set("date", forDate);
	}
	const queryString = searchParams.toString();
	const query = queryString ? `?${queryString}` : "";
	return apiFetch<{ data: DeletedFlagDto }>(`${path}${query}`, {
		method: "DELETE",
		signal: options?.signal,
	});
}
