export type CurrentDietPlanMealItem = {
  mealItemId: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  isOverridden: boolean;
  originalFoodItemId?: string;
  originalFoodName?: string;
  originalQuantity?: number;
};

export type CurrentDietPlanMeal = {
  dietPlanMealId: string;
  mealId: string;
  mealName: string;
  mealType: string;
  mealOrder: number;
  mealItems: CurrentDietPlanMealItem[];
  consumed: boolean;
  consumedAt?: string;
};

export type CurrentDietPlanDay = {
  date: string;
  meals: CurrentDietPlanMeal[];
};

export type CurrentDietPlanAssignment = {
  id: string;
  dietPlanId: string;
  startDate: string;
  endDate: string;
  planName: string;
};

export type CurrentDietPlanResponse =
  | { data: null }
  | {
      data: {
        assignment: CurrentDietPlanAssignment;
        plan: {
          id: string;
          name: string;
          description: string | null;
        };
        days: CurrentDietPlanDay[];
      };
    };
