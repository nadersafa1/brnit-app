import type {
	MealItemOverrideDto,
	MealItemOverrideParams,
	SetMealItemOverrideBody,
} from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

/**
 * The slot to swap plus the swap itself, taken straight from the server's own
 * input types — `scope` and the `startDate`-only window are the contract, and
 * the endpoint rejects the retired `endDate` / `scope: "period"` payloads.
 */
export type SetMealItemOverrideParams = MealItemOverrideParams &
	SetMealItemOverrideBody;

interface SetMealItemOverrideResponse {
	/** False when an existing override row for the slot was updated in place. */
	created: boolean;
	data: MealItemOverrideDto;
}

export function setMealItemOverride(
	params: SetMealItemOverrideParams,
	options?: Pick<ApiFetchOptions, "signal">
): Promise<SetMealItemOverrideResponse> {
	const { assignmentId, dietPlanMealId, mealItemId, ...body } = params;
	return apiFetch<SetMealItemOverrideResponse>(
		API_ENDPOINTS.member.mealItemOverride(
			assignmentId,
			dietPlanMealId,
			mealItemId
		),
		{ method: "PUT", body, signal: options?.signal }
	);
}
