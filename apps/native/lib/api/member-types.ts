export type Macros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type FoodUnit = '100g' | 'piece' | 'liters' | 'cup' | 'tbsp';

export type CurrentDietPlanMealItem = {
  mealItemId: string;
  foodItemId: string;
  foodName: string;
  quantity: number;
  unit: FoodUnit;
  gramsPerUnit: number | null;
  isOverridden: boolean;
  originalFoodItemId?: string;
  originalFoodName?: string;
  originalQuantity?: number;
  originalUnit?: FoodUnit;
  macros: Macros;
};

export type CurrentDietPlanMeal = {
  dietPlanMealId: string;
  mealId: string;
  mealName: string;
  mealType: string;
  mealOrder: number;
  scheduledTime?: string;
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
