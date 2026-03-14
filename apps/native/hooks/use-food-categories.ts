import { useQuery } from "@tanstack/react-query";
import { apiFetch, API_ENDPOINTS } from "@/lib/api";
import { memberKeys } from "@/lib/queries/keys";
import type { FoodCategoriesResponse } from "@/lib/api/member-food-types";

export function useFoodCategories() {
  return useQuery({
    queryKey: memberKeys.foodCategories(),
    queryFn: () =>
      apiFetch<FoodCategoriesResponse>(API_ENDPOINTS.member.foodCategories),
  });
}
