import { useQuery } from "@tanstack/react-query";
import { getMealItemAlternatives } from "@/lib/api/meal-item-alternatives";
import { memberKeys } from "@/lib/queries/keys";

interface UseMealItemAlternativesOptions {
	assignmentId: string;
	date?: string;
	dietPlanMealId: string;
	enabled?: boolean;
	mealItemId: string;
	page?: number;
	perPage?: number;
}

export function useMealItemAlternatives({
	assignmentId,
	dietPlanMealId,
	mealItemId,
	date,
	page,
	perPage,
	enabled = true,
}: UseMealItemAlternativesOptions) {
	return useQuery({
		queryKey: memberKeys.mealItemAlternatives(
			assignmentId,
			dietPlanMealId,
			mealItemId,
			{
				date,
				page,
				perPage,
			}
		),
		queryFn: () =>
			getMealItemAlternatives({
				assignmentId,
				dietPlanMealId,
				mealItemId,
				date,
				page,
				perPage,
			}),
		enabled: enabled && !!assignmentId && !!dietPlanMealId && !!mealItemId,
	});
}
