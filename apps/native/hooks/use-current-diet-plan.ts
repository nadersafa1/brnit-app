import type { CurrentDietPlanDto, CurrentDietPlanInput } from "@brnit/api";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { memberKeys } from "@/lib/queries/keys";

/**
 * `?from` / `?to` are the server's own input type: both optional, both
 * `'YYYY-MM-DD'`, and the range is capped at 31 days server-side. Omitting them
 * gets today (UTC) through today + 6d.
 */
export function useCurrentDietPlan(query?: CurrentDietPlanInput) {
	const params = new URLSearchParams();
	if (query?.from) {
		params.set("from", query.from);
	}
	if (query?.to) {
		params.set("to", query.to);
	}

	const queryString = params.toString();
	const path = queryString
		? `${API_ENDPOINTS.member.currentDietPlan}?${queryString}`
		: API_ENDPOINTS.member.currentDietPlan;

	return useQuery({
		queryKey: memberKeys.currentDietPlan(query),
		queryFn: () => apiFetch<CurrentDietPlanDto>(path),
	});
}
