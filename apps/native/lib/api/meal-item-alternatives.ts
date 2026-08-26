import type {
	FoodItemAlternativesResponse,
	MealItemAlternativesQuery,
	MealItemOverrideParams,
} from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

/**
 * Alternatives for whatever the slot currently shows on `date`. There is no
 * `quantity` parameter — the server resolves both the food and the amount from
 * the plan (overrides included), so the client cannot disagree with it.
 */
export type MealItemAlternativesParams = MealItemOverrideParams &
	Partial<MealItemAlternativesQuery>;

function buildMealItemAlternativesUrl({
	assignmentId,
	dietPlanMealId,
	mealItemId,
	page,
	perPage,
	date,
}: MealItemAlternativesParams): string {
	const params = new URLSearchParams();
	if (page) {
		params.set("page", String(page));
	}
	if (perPage) {
		params.set("perPage", String(perPage));
	}
	if (date) {
		params.set("date", date);
	}

	const base = API_ENDPOINTS.member.mealItemAlternatives(
		assignmentId,
		dietPlanMealId,
		mealItemId
	);
	const query = params.toString();
	return query ? `${base}?${query}` : base;
}

export function getMealItemAlternatives(
	params: MealItemAlternativesParams,
	options?: Pick<ApiFetchOptions, "signal">
): Promise<FoodItemAlternativesResponse> {
	return apiFetch<FoodItemAlternativesResponse>(
		buildMealItemAlternativesUrl(params),
		{ signal: options?.signal }
	);
}
