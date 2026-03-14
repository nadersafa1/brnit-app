export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type CurrentDietPlanMealItem = {
  mealItemId: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  isOverridden: boolean;
  originalFoodItemId?: string;
  originalFoodName?: string;
  originalQuantity?: number;
  macros: Macros;
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
  macros: Macros;
};

export type CurrentDietPlanDay = {
  date: string;
  meals: CurrentDietPlanMeal[];
  macros: Macros;
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
