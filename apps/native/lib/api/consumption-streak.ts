import type { ConsumptionStreakDto } from "@brnit/api";

import { apiFetch } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiFetchOptions } from "./types";

/** Consecutive days with at least one logged meal, ending today (UTC, server-side). */
export function getConsumptionStreak(
	options?: Pick<ApiFetchOptions, "signal">
): Promise<ConsumptionStreakDto> {
	return apiFetch<ConsumptionStreakDto>(
		API_ENDPOINTS.member.consumptionStreak,
		{ method: "GET", signal: options?.signal }
	);
}
