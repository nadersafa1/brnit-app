import type { FoodItem, FoodItemAlternative } from "@/lib/api/member-food-types";

export type SheetState = "input" | "results";

export interface FoodAlternativesSheetProps {
  foodItem: FoodItem | null;
  onClose: () => void;
}

export interface AlternativeItemProps {
  alternative: FoodItemAlternative;
  onCopy: (alternative: FoodItemAlternative) => void;
}

export interface QuantityFormData {
  quantity: string;
}
