export const memberKeys = {
  all: ["member"] as const,
  currentDietPlan: (query?: { from?: string; to?: string }) =>
    [...memberKeys.all, "current-diet-plan", query] as const,
  dietPlanAssignments: (filters?: object) =>
    [...memberKeys.all, "diet-plan-assignments", filters] as const,
  dietPlanMealConsumptions: (filters?: object) =>
    [...memberKeys.all, "diet-plan-meal-consumptions", filters] as const,
  foodItems: (filters?: object) =>
    [...memberKeys.all, "food-items", filters] as const,
  foodItemAlternatives: (foodItemId: string, query?: object) =>
    [...memberKeys.all, "food-items", foodItemId, "alternatives", query] as const,
} as const;
