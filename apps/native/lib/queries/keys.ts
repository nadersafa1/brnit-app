export const memberKeys = {
  all: ["member"] as const,
  currentDietPlanRoot: () => [...memberKeys.all, "current-diet-plan"] as const,
  currentDietPlan: (query?: { from?: string; to?: string }) =>
    [...memberKeys.currentDietPlanRoot(), query] as const,
  dietPlanAssignments: (filters?: object) =>
    [...memberKeys.all, "diet-plan-assignments", filters] as const,
  dietPlanMealConsumptions: (filters?: object) =>
    [...memberKeys.all, "diet-plan-meal-consumptions", filters] as const,
  foodItems: (filters?: object) =>
    [...memberKeys.all, "food-items", filters] as const,
  foodItemAlternatives: (foodItemId: string, query?: object) =>
    [...memberKeys.all, "food-items", foodItemId, "alternatives", query] as const,
  mealItemAlternatives: (
    assignmentId: string,
    dietPlanMealId: string,
    mealItemId: string,
    query?: object
  ) =>
    [
      ...memberKeys.all,
      "diet-plan-assignments",
      assignmentId,
      "meal-entries",
      dietPlanMealId,
      "items",
      mealItemId,
      "alternatives",
      query,
    ] as const,
  foodCategories: () => [...memberKeys.all, "food-categories"] as const,
} as const;
