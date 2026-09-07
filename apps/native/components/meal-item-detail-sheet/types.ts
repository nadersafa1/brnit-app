import type {
	CurrentDietPlanMealItemDto,
	FoodItemAlternativeDto,
} from "@brnit/api";

export interface MealItemDetailContentProps {
	alternatives: FoodItemAlternativeDto[];
	isError: boolean;
	isLoading: boolean;
	item: CurrentDietPlanMealItemDto;
	onSelectAlternative: (alternative: FoodItemAlternativeDto) => void;
	selectedAlternative: FoodItemAlternativeDto | null;
}

export interface MealItemDetailPayload {
	consumedDate: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
	item: CurrentDietPlanMealItemDto;
}

export type OverrideScope = "day" | "plan";

export interface MealItemDetailSheetProps {
	onClose: () => void;
	payload: MealItemDetailPayload | null;
}

export interface MealItemDetailActionsProps {
	isRestoringForDay: boolean;
	isSubmittingDay: boolean;
	isSubmittingPlan: boolean;
	itemIsOverridden: boolean;
	onReplaceDay: () => void;
	onReplacePlan: () => void;
	onRestoreOriginalForDay: () => void;
	selectedAlternative: FoodItemAlternativeDto | null;
}
