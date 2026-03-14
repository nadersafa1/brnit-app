import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type MarkMealConsumedParams = {
  dietPlanAssignmentId: string;
  dietPlanMealId: string;
  /** ISO datetime for the consumed day so backend consumedDate matches the selected date. */
  consumedAt: string;
};

type CreateConsumptionResponse = { data: { id: string } };

/** POST to create a meal consumption (mark as consumed). Uses usePlannedItems so backend fills items from plan. */
export async function markMealConsumed(
  params: MarkMealConsumedParams,
  options?: Pick<ApiFetchOptions, "signal">
): Promise<CreateConsumptionResponse> {
  const body = {
    dietPlanAssignmentId: params.dietPlanAssignmentId,
    dietPlanMealId: params.dietPlanMealId,
    consumedAt: params.consumedAt,
    usePlannedItems: true,
  };
  return apiFetch<CreateConsumptionResponse>(
    API_ENDPOINTS.member.dietPlanMealConsumptions,
    { method: "POST", body, signal: options?.signal }
  );
}
