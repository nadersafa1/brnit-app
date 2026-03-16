import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";
import type {
  FoodItemAlternativesResponse,
  FoodItemAlternativesQuery,
} from "./member-food-types";

export type MealItemAlternativesParams = {
  assignmentId: string;
  dietPlanMealId: string;
  mealItemId: string;
} & Omit<FoodItemAlternativesQuery, "quantity"> & { date?: string };

function buildMealItemAlternativesUrl({
  assignmentId,
  dietPlanMealId,
  mealItemId,
  page,
  perPage,
  date,
}: MealItemAlternativesParams): string {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (perPage) params.set("perPage", String(perPage));
  if (date) params.set("date", date);

  const base = API_ENDPOINTS.member.mealItemAlternatives(
    assignmentId,
    dietPlanMealId,
    mealItemId
  );
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export async function getMealItemAlternatives(
  params: MealItemAlternativesParams,
  options?: Pick<ApiFetchOptions, "signal">
): Promise<FoodItemAlternativesResponse> {
  return apiFetch<FoodItemAlternativesResponse>(
    buildMealItemAlternativesUrl(params),
    { signal: options?.signal }
  );
}
