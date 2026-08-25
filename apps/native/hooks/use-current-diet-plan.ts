import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { memberKeys } from "@/lib/queries/keys";
import type { CurrentDietPlanResponse } from "@/lib/api/member-types";

type CurrentDietPlanQuery = {
  from?: string;
  to?: string;
};

export function useCurrentDietPlan(query?: CurrentDietPlanQuery) {
  const params = new URLSearchParams();
  if (query?.from) params.set("from", query.from);
  if (query?.to) params.set("to", query.to);

  const queryString = params.toString();
  const path = queryString
    ? `${API_ENDPOINTS.member.currentDietPlan}?${queryString}`
    : API_ENDPOINTS.member.currentDietPlan;

  return useQuery({
    queryKey: memberKeys.currentDietPlan(query),
    queryFn: () => apiFetch<CurrentDietPlanResponse>(path),
  });
}
