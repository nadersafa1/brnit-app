import type { FoodItemAlternativesResponse } from "@brnit/api";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { FoodItemAlternativesQuery } from "@/lib/api/food-query";
import { memberKeys } from "@/lib/queries/keys";

function buildAlternativesUrl(
	foodItemId: string,
	query: FoodItemAlternativesQuery
): string {
	const params = new URLSearchParams();
	params.set("quantity", String(query.quantity));
	if (query.page) {
		params.set("page", String(query.page));
	}
	if (query.perPage) {
		params.set("perPage", String(query.perPage));
	}

	return `${API_ENDPOINTS.member.foodItemAlternatives(foodItemId)}?${params.toString()}`;
}

interface UseFoodItemAlternativesOptions {
	enabled?: boolean;
	foodItemId: string;
	quantity: number;
}

export function useFoodItemAlternatives({
	foodItemId,
	quantity,
	enabled = true,
}: UseFoodItemAlternativesOptions) {
	return useQuery({
		queryKey: memberKeys.foodItemAlternatives(foodItemId, { quantity }),
		queryFn: () =>
			apiFetch<FoodItemAlternativesResponse>(
				buildAlternativesUrl(foodItemId, { quantity })
			),
		enabled: enabled && !!foodItemId && quantity > 0,
	});
}
