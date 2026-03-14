import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type DeleteMealConsumptionParams = {
  dietPlanAssignmentId: string;
  dietPlanMealId: string;
  consumedDate: string;
};

type DeleteConsumptionResponse = { data: { deleted: true } };

/** DELETE to remove a meal consumption by slot (unmark as consumed). */
export async function deleteMealConsumption(
  params: DeleteMealConsumptionParams,
  options?: Pick<ApiFetchOptions, "signal">
): Promise<DeleteConsumptionResponse> {
  const body = {
    dietPlanAssignmentId: params.dietPlanAssignmentId,
    dietPlanMealId: params.dietPlanMealId,
    consumedDate: params.consumedDate,
  };
  return apiFetch<DeleteConsumptionResponse>(
    API_ENDPOINTS.member.dietPlanMealConsumptions,
    { method: "DELETE", body, signal: options?.signal }
  );
}
