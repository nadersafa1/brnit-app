import type { CurrentDietPlanMealDto } from "@brnit/api";

/** Identifies one plan meal line (slot) for override DELETE APIs. */
export interface MealItemOverrideSlot {
	dietPlanMealId: string;
	mealItemId: string;
}

/** Collects slots where the API is showing a swapped food for the resolved day. */
export function collectOverriddenMealItemSlots(
	meals: CurrentDietPlanMealDto[]
): MealItemOverrideSlot[] {
	const slots: MealItemOverrideSlot[] = [];
	for (const meal of meals) {
		for (const item of meal.mealItems) {
			if (item.isOverridden) {
				slots.push({
					dietPlanMealId: meal.dietPlanMealId,
					mealItemId: item.mealItemId,
				});
			}
		}
	}
	return slots;
}
