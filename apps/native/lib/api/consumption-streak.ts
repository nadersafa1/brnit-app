import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

export type ConsumptionStreakResponse = { streak: number };

/** Fetches current consumption streak (consecutive days with ≥1 logged meal, ending today). */
export async function getConsumptionStreak(
  options?: Pick<ApiFetchOptions, "signal">
): Promise<ConsumptionStreakResponse> {
  return apiFetch<ConsumptionStreakResponse>(
    API_ENDPOINTS.member.consumptionStreak,
    { method: "GET", signal: options?.signal }
  );
}
