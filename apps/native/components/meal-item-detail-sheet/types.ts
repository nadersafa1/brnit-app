import type { CurrentDietPlanMealItem } from "@/lib/api/member-types";
import type { FoodItemAlternative } from "@/lib/api/member-food-types";

export type MealItemDetailContentProps = {
  item: CurrentDietPlanMealItem;
  alternatives: FoodItemAlternative[];
  isLoading: boolean;
  isError: boolean;
  selectedAlternative: FoodItemAlternative | null;
  onSelectAlternative: (alternative: FoodItemAlternative) => void;
};

export type MealItemDetailPayload = {
  item: CurrentDietPlanMealItem;
  dietPlanAssignmentId: string;
  dietPlanMealId: string;
  consumedDate: string;
};

export type OverrideScope = "day" | "plan";

export type MealItemDetailSheetProps = {
  payload: MealItemDetailPayload | null;
  onClose: () => void;
};

export type MealItemDetailActionsProps = {
  selectedAlternative: FoodItemAlternative | null;
  isSubmittingDay: boolean;
  isSubmittingPlan: boolean;
  onReplaceDay: () => void;
  onReplacePlan: () => void;
};
