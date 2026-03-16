import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type SetMealItemOverrideParams = {
  assignmentId: string;
  dietPlanMealId: string;
  mealItemId: string;
  foodItemId: string;
  quantity: number;
  date?: string;
};

type SetMealItemOverrideResponse = {
  data: {
    id: string;
    dietPlanAssignmentId: string;
    dietPlanMealId: string;
    mealItemId: string;
    foodItemId: string;
    quantity: number;
    effectiveDate: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export async function setMealItemOverride(
  params: SetMealItemOverrideParams,
  options?: Pick<ApiFetchOptions, "signal">
): Promise<SetMealItemOverrideResponse> {
  const { assignmentId, dietPlanMealId, mealItemId, ...body } = params;
  return apiFetch<SetMealItemOverrideResponse>(
    API_ENDPOINTS.member.mealItemOverride(assignmentId, dietPlanMealId, mealItemId),
    {
      method: "PUT",
      body,
      signal: options?.signal,
    }
  );
}
