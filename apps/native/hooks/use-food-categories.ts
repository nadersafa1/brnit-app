import type { FoodCategorySummaryListResponse } from "@brnit/api";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { memberKeys } from "@/lib/queries/keys";

export function useFoodCategories() {
	return useQuery({
		queryKey: memberKeys.foodCategories(),
		queryFn: () =>
			apiFetch<FoodCategorySummaryListResponse>(
				API_ENDPOINTS.member.foodCategories
			),
	});
}
