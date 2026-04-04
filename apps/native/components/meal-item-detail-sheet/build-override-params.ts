import type { FoodItemAlternative } from '@/lib/api/member-food-types'
import type { SetMealItemOverrideParams } from '@/lib/api/set-meal-item-override'

import type { MealItemDetailPayload, OverrideScope } from './types'

/** Maps sheet UI scope + payload to the member meal-item override API body. */
export function buildSetMealItemOverrideParams(
  payload: MealItemDetailPayload,
  alternative: FoodItemAlternative,
  scope: OverrideScope
): SetMealItemOverrideParams {
  const base = {
    assignmentId: payload.dietPlanAssignmentId,
    dietPlanMealId: payload.dietPlanMealId,
    mealItemId: payload.item.mealItemId,
    foodItemId: alternative.foodItemId,
    quantity: alternative.suggestedQuantity,
    startDate: payload.consumedDate,
  }
  if (scope === 'day') {
    return { ...base, scope: 'single_day' as const }
  }
  return { ...base, scope: 'rest_of_plan' as const }
}
