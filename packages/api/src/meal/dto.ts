import {
	DEFAULT_FOOD_UNIT,
	type FoodUnit,
	roundNutritionMacroRequired,
} from "@brnit/domain";

/**
 * Wire shapes for the meal endpoints.
 *
 * Every `numeric` column arrives from Drizzle as a **string**; the mappers are
 * the single place that turns those into numbers, rounding with the *persisted*
 * rule (nearest, 2dp) because these values come straight off `meal.total_*`.
 * The member-facing `roundUpToTenth` rule is deliberately not used here — see
 * `@brnit/domain/nutrition-rounding`.
 *
 * Timestamps are serialized as ISO strings so the DTO is the same type on the
 * server and in the clients, rather than `Date` on one side and `string` on the
 * other after `JSON.stringify`.
 */

export interface FoodCategoryRefDto {
	id: string;
	name: string;
}

export interface MealDto {
	createdAt: string;
	description: string | null;
	id: string;
	name: string;
	totalCalories: number;
	totalCarbs: number;
	totalFat: number;
	totalProtein: number;
	updatedAt: string;
}

export interface MealItemDto {
	calories: number;
	carbs: number;
	categories: FoodCategoryRefDto[];
	fat: number;
	foodItemId: string;
	foodName: string;
	gramsPerUnit: number | null;
	id: string;
	protein: number;
	quantity: number;
	unit: FoodUnit;
}

export interface MealDetailDto extends MealDto {
	mealItems: MealItemDto[];
}

export interface MealRow {
	createdAt: Date;
	description: string | null;
	id: string;
	name: string;
	totalCalories: string;
	totalCarbs: string;
	totalFat: string;
	totalProtein: string;
	updatedAt: Date;
}

export interface MealItemRow {
	foodItem: {
		calories: string;
		carbs: string;
		fat: string;
		foodItemCategories: Array<{ category: FoodCategoryRefDto }>;
		gramsPerUnit: string | null;
		name: string;
		protein: string;
		unit: FoodUnit | null;
	};
	foodItemId: string;
	id: string;
	quantity: string;
}

/** `null` stays `null`; the column is a nullable bare `numeric`. */
function toNullableNumber(value: string | null): number | null {
	return value == null ? null : Number(value);
}

/** Junction rows → `{ id, name }[]` ordered by name, as every food read does. */
function toSortedCategories(
	foodItemCategories: Array<{ category: FoodCategoryRefDto }>
): FoodCategoryRefDto[] {
	return foodItemCategories
		.map((row) => ({ id: row.category.id, name: row.category.name }))
		.sort((a, b) => a.name.localeCompare(b.name));
}

export function mealToDto(row: MealRow): MealDto {
	return {
		createdAt: row.createdAt.toISOString(),
		description: row.description,
		id: row.id,
		name: row.name,
		totalCalories: roundNutritionMacroRequired(row.totalCalories),
		totalCarbs: roundNutritionMacroRequired(row.totalCarbs),
		totalFat: roundNutritionMacroRequired(row.totalFat),
		totalProtein: roundNutritionMacroRequired(row.totalProtein),
		updatedAt: row.updatedAt.toISOString(),
	};
}

export function mealItemToDto(row: MealItemRow): MealItemDto {
	return {
		calories: roundNutritionMacroRequired(row.foodItem.calories),
		carbs: roundNutritionMacroRequired(row.foodItem.carbs),
		categories: toSortedCategories(row.foodItem.foodItemCategories),
		fat: roundNutritionMacroRequired(row.foodItem.fat),
		foodItemId: row.foodItemId,
		foodName: row.foodItem.name,
		gramsPerUnit: toNullableNumber(row.foodItem.gramsPerUnit),
		id: row.id,
		protein: roundNutritionMacroRequired(row.foodItem.protein),
		quantity: Number(row.quantity),
		unit: row.foodItem.unit ?? DEFAULT_FOOD_UNIT,
	};
}

export function mealToDetailDto(
	row: MealRow,
	itemRows: MealItemRow[]
): MealDetailDto {
	return {
		...mealToDto(row),
		mealItems: itemRows.map(mealItemToDto),
	};
}
