import { DEFAULT_FOOD_UNIT, type FoodUnit } from "@brnit/domain";

/**
 * Wire shapes for the diet-plan endpoints.
 *
 * Three shapes, because the three reads legitimately differ:
 * - {@link DietPlanDto} — the plan header, returned by create and delete.
 * - {@link DietPlanListItemDto} — header plus `slotCount`, the aggregate the
 *   list view renders.
 * - {@link DietPlanDetailDto} — header plus every slot and the meal lines each
 *   slot resolves to, which is what the plan editor loads.
 *
 * `quantity` and `gramsPerUnit` are bare `numeric` columns and therefore arrive
 * as strings; they become numbers here. No macro rounding happens on this path
 * — the plan editor shows quantities, and the member-facing macro maths lives
 * on the current-diet-plan read instead.
 */

export interface DietPlanDto {
	createdAt: string;
	description: string | null;
	id: string;
	name: string;
	updatedAt: string;
}

export interface DietPlanListItemDto extends DietPlanDto {
	/** Number of `diet_plan_meal` rows; 0 for a plan with no slots yet. */
	slotCount: number;
}

export interface DietPlanMealItemDto {
	foodItemId: string;
	foodName: string;
	gramsPerUnit: number | null;
	mealItemId: string;
	quantity: number;
	unit: FoodUnit;
}

export interface DietPlanMealDto {
	/** `0` means the slot repeats every day; `>= 1` pins it to that day. */
	dayNumber: number;
	id: string;
	mealId: string;
	mealItems: DietPlanMealItemDto[];
	mealName: string;
	mealOrder: number;
	/** Free text, not an enum. */
	mealType: string;
	/** `HH:mm`, or `null` when the slot has no default time. */
	scheduledTime: string | null;
}

export interface DietPlanDetailDto extends DietPlanDto {
	dietPlanMeals: DietPlanMealDto[];
}

export interface DietPlanRow {
	createdAt: Date;
	description: string | null;
	id: string;
	name: string;
	updatedAt: Date;
}

export interface DietPlanSlotRow {
	dayNumber: number;
	id: string;
	mealId: string;
	mealName: string;
	mealOrder: number;
	mealType: string;
	scheduledTime: string | null;
}

export interface DietPlanMealItemRow {
	foodItemId: string;
	foodName: string;
	gramsPerUnit: string | null;
	mealId: string;
	mealItemId: string;
	quantity: string;
	unit: FoodUnit | null;
}

export function dietPlanToDto(row: DietPlanRow): DietPlanDto {
	return {
		createdAt: row.createdAt.toISOString(),
		description: row.description,
		id: row.id,
		name: row.name,
		updatedAt: row.updatedAt.toISOString(),
	};
}

export function dietPlanToListItemDto(
	row: DietPlanRow & { slotCount: number | string }
): DietPlanListItemDto {
	return {
		...dietPlanToDto(row),
		slotCount: Number(row.slotCount) || 0,
	};
}

export function dietPlanMealItemToDto(
	row: DietPlanMealItemRow
): DietPlanMealItemDto {
	return {
		foodItemId: row.foodItemId,
		foodName: row.foodName,
		gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
		mealItemId: row.mealItemId,
		quantity: Number(row.quantity),
		unit: row.unit ?? DEFAULT_FOOD_UNIT,
	};
}

/**
 * Groups the batched `meal_item` rows by `meal_id` so each slot can be given
 * its lines without a per-slot query.
 */
export function groupDietPlanMealItemsByMealId(
	rows: DietPlanMealItemRow[]
): Map<string, DietPlanMealItemDto[]> {
	const byMealId = new Map<string, DietPlanMealItemDto[]>();
	for (const row of rows) {
		const list = byMealId.get(row.mealId);
		const dto = dietPlanMealItemToDto(row);
		if (list) {
			list.push(dto);
		} else {
			byMealId.set(row.mealId, [dto]);
		}
	}
	return byMealId;
}

export function dietPlanToDetailDto(
	row: DietPlanRow,
	slotRows: DietPlanSlotRow[],
	itemRows: DietPlanMealItemRow[]
): DietPlanDetailDto {
	const itemsByMealId = groupDietPlanMealItemsByMealId(itemRows);
	return {
		...dietPlanToDto(row),
		dietPlanMeals: slotRows.map((slot) => ({
			dayNumber: slot.dayNumber,
			id: slot.id,
			mealId: slot.mealId,
			mealItems: itemsByMealId.get(slot.mealId) ?? [],
			mealName: slot.mealName,
			mealOrder: slot.mealOrder,
			mealType: slot.mealType,
			scheduledTime: slot.scheduledTime,
		})),
	};
}
