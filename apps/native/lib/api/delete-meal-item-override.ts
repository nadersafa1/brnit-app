import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type DeleteMealItemOverrideParams = {
  assignmentId: string;
  dietPlanMealId: string;
  mealItemId: string;
  /** When set, removes only this date from the override row; otherwise clears all overrides for the slot. */
  forDate?: string;
};

type DeleteMealItemOverrideResponse = {
  data: { deleted: true };
};

export async function deleteMealItemOverride(
  params: DeleteMealItemOverrideParams,
  options?: Pick<ApiFetchOptions, "signal">
): Promise<DeleteMealItemOverrideResponse> {
  const { assignmentId, dietPlanMealId, mealItemId, forDate } = params;
  const path = API_ENDPOINTS.member.mealItemOverride(
    assignmentId,
    dietPlanMealId,
    mealItemId
  );
  const searchParams = new URLSearchParams();
  if (forDate) searchParams.set("date", forDate);
  const queryString = searchParams.toString();
  const query = queryString ? `?${queryString}` : "";
  return apiFetch<DeleteMealItemOverrideResponse>(`${path}${query}`, {
    method: "DELETE",
    signal: options?.signal,
  });
}
