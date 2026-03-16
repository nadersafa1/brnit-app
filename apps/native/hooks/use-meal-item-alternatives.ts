import { useQuery } from "@tanstack/react-query";
import { getMealItemAlternatives } from "@/lib/api/meal-item-alternatives";
import { memberKeys } from "@/lib/queries/keys";

type UseMealItemAlternativesOptions = {
  assignmentId: string;
  dietPlanMealId: string;
  mealItemId: string;
  date?: string;
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

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
    queryKey: memberKeys.mealItemAlternatives(assignmentId, dietPlanMealId, mealItemId, {
      date,
      page,
      perPage,
    }),
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
