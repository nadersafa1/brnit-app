import type { FoodItemAlternativeDto, FoodItemDto } from "@brnit/api";

export type SheetState = "input" | "results";

export interface FoodAlternativesSheetProps {
	foodItem: FoodItemDto | null;
	onClose: () => void;
}

export interface AlternativeItemProps {
	alternative: FoodItemAlternativeDto;
	onCopy: (alternative: FoodItemAlternativeDto) => void;
}

export interface QuantityFormData {
	quantity: string;
}
