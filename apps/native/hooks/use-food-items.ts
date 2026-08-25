import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { memberKeys } from "@/lib/queries/keys";
import type { FoodItemsResponse, FoodItemsQuery } from "@/lib/api/member-food-types";

const DEFAULT_PER_PAGE = 20;

function buildFoodItemsUrl(query: FoodItemsQuery, page: number): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("perPage", String(query.perPage ?? DEFAULT_PER_PAGE));

  if (query.q) params.set("q", query.q);
  if (query.categoryId) params.set("categoryId", query.categoryId);
  if (query.sortBy) params.set("sortBy", query.sortBy);
  if (query.sortOrder) params.set("sortOrder", query.sortOrder);

  return `${API_ENDPOINTS.member.foodItems}?${params.toString()}`;
}

export function useFoodItems(query: Omit<FoodItemsQuery, "page"> = {}) {
  const filters = {
    q: query.q,
    categoryId: query.categoryId,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
    perPage: query.perPage ?? DEFAULT_PER_PAGE,
  };

  return useInfiniteQuery({
    queryKey: memberKeys.foodItems(filters),
    queryFn: ({ pageParam }) =>
      apiFetch<FoodItemsResponse>(buildFoodItemsUrl(filters, pageParam)),
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    initialPageParam: 1,
  });
}
