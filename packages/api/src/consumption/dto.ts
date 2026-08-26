/**
 * Wire shapes for meal consumptions.
 *
 * `consumedDate` is the UTC calendar day and stays a `'YYYY-MM-DD'` string;
 * `consumedAt` and `createdAt` are instants and become ISO strings.
 */

export interface ConsumedItemDto {
	foodItemId: string;
	foodName: string;
	quantity: number;
}

/** What a create or delete returns: the consumption row itself. */
export interface DietPlanMealConsumptionDto {
	consumedAt: string;
	consumedDate: string;
	createdAt: string;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
	id: string;
}

/** What the list returns: the row plus the meal's name and its item snapshot. */
export interface DietPlanMealConsumptionListItemDto
	extends DietPlanMealConsumptionDto {
	consumedItems: ConsumedItemDto[];
	mealName: string;
}

interface ConsumptionRow {
	consumedAt: Date;
	consumedDate: string;
	createdAt: Date;
	dietPlanAssignmentId: string;
	dietPlanMealId: string;
	id: string;
}

interface ConsumptionListRow extends ConsumptionRow {
	consumedItems: {
		foodItem: { name: string };
		foodItemId: string;
		quantity: string;
	}[];
	dietPlanMeal: { meal: { name: string } };
}

export function dietPlanMealConsumptionToDto(
	row: ConsumptionRow
): DietPlanMealConsumptionDto {
	return {
		consumedAt: row.consumedAt.toISOString(),
		consumedDate: row.consumedDate,
		createdAt: row.createdAt.toISOString(),
		dietPlanAssignmentId: row.dietPlanAssignmentId,
		dietPlanMealId: row.dietPlanMealId,
		id: row.id,
	};
}

/** `quantity` is a bare `numeric`, so Drizzle hands it over as a string. */
export function dietPlanMealConsumptionToListItemDto(
	row: ConsumptionListRow
): DietPlanMealConsumptionListItemDto {
	return {
		...dietPlanMealConsumptionToDto(row),
		consumedItems: row.consumedItems.map((item) => ({
			foodItemId: item.foodItemId,
			foodName: item.foodItem.name,
			quantity: Number(item.quantity),
		})),
		mealName: row.dietPlanMeal.meal.name,
	};
}
