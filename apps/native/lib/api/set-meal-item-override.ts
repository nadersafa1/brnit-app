import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type SetMealItemOverrideParams = {
  assignmentId: string;
  dietPlanMealId: string;
  mealItemId: string;
  overrideId?: string;
  foodItemId: string;
  quantity: number;
  scope: "single_day" | "rest_of_plan";
  startDate: string;
};

type SetMealItemOverrideResponse = {
  data: {
    id: string;
    dietPlanAssignmentId: string;
    dietPlanMealId: string;
    mealItemId: string;
    foodItemId: string;
    quantity: number;
    effectiveDates: string[];
    effectiveDateCount: number;
    coverageStartDate: string | null;
    coverageEndDate: string | null;
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
