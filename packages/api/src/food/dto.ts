import type { FoodUnit } from "@brnit/domain";
import { roundNutritionMacroRequired } from "@brnit/domain";

import { buildCloudinaryUrl } from "../cloudinary/url";
import type { PaginatedResponse } from "../pagination/offset";

/**
 * DTOs for food categories and food items.
 *
 * Two conversions happen in every mapper and both are load-bearing:
 *
 * - `numeric` columns reach the application as **strings** (Drizzle maps bare
 *   `numeric` that way), so every macro is parsed and rounded to the persisted
 *   2-decimal precision before it leaves the API.
 * - `timestamp` columns are `Date`s, emitted as ISO strings. `JSON.stringify`
 *   would produce exactly the same text, so this is a type-level honesty fix
 *   rather than a wire change.
 */

export interface FoodItemCategoryDto {
	id: string;
	name: string;
}

export interface FoodCategoryDto {
	createdAt: string;
	description: string | null;
	id: string;
	name: string;
}

/** Trimmed category shape used by the flat member list (no timestamps). */
export interface FoodCategorySummaryDto {
	description: string | null;
	id: string;
	name: string;
}

export interface FoodItemDto {
	calories: number;
	carbs: number;
	categories: FoodItemCategoryDto[];
	createdAt: string;
	fat: number;
	gramsPerUnit: number | null;
	id: string;
	imageUrl: string | null;
	name: string;
	protein: number;
	unit: FoodUnit;
	updatedAt: string;
}

/**
 * The deleted-row echo returned by `DELETE /admin/food-items/:id`.
 *
 * Deliberately **not** a {@link FoodItemDto}: the endpoint has always returned
 * the raw row Postgres deleted, with `numeric` columns still stringly typed and
 * `imagePublicId` instead of a delivery URL. Clients treat it as a receipt, so
 * the shape is preserved verbatim.
 */
export interface DeletedFoodItemDto {
	calories: string;
	carbs: string;
	createdAt: string;
	fat: string;
	gramsPerUnit: string | null;
	id: string;
	imagePublicId: string | null;
	name: string;
	protein: string;
	unit: FoodUnit;
	updatedAt: string;
}

export interface FoodItemAlternativeDto {
	calories: number;
	carbs: number;
	categories: FoodItemCategoryDto[];
	deltaCalories: number;
	deltaCarbs: number;
	deltaFat: number;
	deltaProtein: number;
	fat: number;
	foodItemId: string;
	name: string;
	protein: number;
	/** Quantity to eat, expressed in this food's own unit (150 for "150g", 2 for "2 pieces"). */
	suggestedQuantity: number;
	/** @deprecated Use `suggestedQuantity` with `unit`. Omitted when the food has no gram equivalence. */
	suggestedQuantityGrams?: number;
	unit: FoodUnit;
}

// ---------------------------------------------------------------------------
// Response envelopes — brnit wraps single entities in `{ data }` and lists in
// `{ data, pagination }`. The handlers return these directly so controllers
// stay a bare `res.json(await handler(ctx, input))`.
// ---------------------------------------------------------------------------

export interface FoodCategoryResponse {
	data: FoodCategoryDto;
}

export type FoodCategoryListResponse = PaginatedResponse<FoodCategoryDto>;

export interface FoodCategorySummaryListResponse {
	data: FoodCategorySummaryDto[];
}

export interface FoodItemResponse {
	data: FoodItemDto;
}

export type FoodItemListResponse = PaginatedResponse<FoodItemDto>;

export interface DeletedFoodItemResponse {
	data: DeletedFoodItemDto;
}

export type FoodItemAlternativesResponse =
	PaginatedResponse<FoodItemAlternativeDto>;

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

export interface FoodCategoryRow {
	createdAt: Date;
	description: string | null;
	id: string;
	name: string;
}

export interface FoodCategorySummaryRow {
	description: string | null;
	id: string;
	name: string;
}

/** Junction row as returned by the `with: { foodItemCategories: { with: { category } } }` read. */
export interface FoodItemCategoryJoinRow {
	category: { id: string; name: string };
}

export interface FoodItemRow {
	calories: string | null;
	carbs: string | null;
	createdAt: Date;
	fat: string | null;
	foodItemCategories: FoodItemCategoryJoinRow[];
	gramsPerUnit: string | null;
	id: string;
	imagePublicId: string | null;
	name: string;
	protein: string | null;
	unit: FoodUnit;
	updatedAt: Date;
}

export interface DeletedFoodItemRow {
	calories: string;
	carbs: string;
	createdAt: Date;
	fat: string;
	gramsPerUnit: string | null;
	id: string;
	imagePublicId: string | null;
	name: string;
	protein: string;
	unit: FoodUnit;
	updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

/**
 * Junction rows to `{ id, name }`, sorted by name.
 *
 * The many-to-many read returns junction rows in insertion order, which is
 * meaningless to a reader, so the API sorts once here and every consumer —
 * list, detail and alternatives — renders the same order.
 */
/** Delivery URL for a stored public id, or `null` when the item has no image. */
function foodItemImageUrl(publicId: string | null): string | null {
	return publicId ? buildCloudinaryUrl(publicId) : null;
}

export function foodItemCategoriesToDto(
	rows: FoodItemCategoryJoinRow[]
): FoodItemCategoryDto[] {
	return rows
		.map((row) => ({ id: row.category.id, name: row.category.name }))
		.sort((left, right) => left.name.localeCompare(right.name));
}

export function foodCategoryToDto(row: FoodCategoryRow): FoodCategoryDto {
	return {
		createdAt: row.createdAt.toISOString(),
		description: row.description,
		id: row.id,
		name: row.name,
	};
}

export function foodCategoryToSummaryDto(
	row: FoodCategorySummaryRow
): FoodCategorySummaryDto {
	return {
		description: row.description,
		id: row.id,
		name: row.name,
	};
}

export function foodItemToDto(row: FoodItemRow): FoodItemDto {
	return {
		calories: roundNutritionMacroRequired(row.calories),
		carbs: roundNutritionMacroRequired(row.carbs),
		categories: foodItemCategoriesToDto(row.foodItemCategories),
		createdAt: row.createdAt.toISOString(),
		fat: roundNutritionMacroRequired(row.fat),
		gramsPerUnit: row.gramsPerUnit == null ? null : Number(row.gramsPerUnit),
		id: row.id,
		imageUrl: foodItemImageUrl(row.imagePublicId),
		name: row.name,
		protein: roundNutritionMacroRequired(row.protein),
		unit: row.unit,
		updatedAt: row.updatedAt.toISOString(),
	};
}

export function deletedFoodItemToDto(
	row: DeletedFoodItemRow
): DeletedFoodItemDto {
	return {
		calories: row.calories,
		carbs: row.carbs,
		createdAt: row.createdAt.toISOString(),
		fat: row.fat,
		gramsPerUnit: row.gramsPerUnit,
		id: row.id,
		imagePublicId: row.imagePublicId,
		name: row.name,
		protein: row.protein,
		unit: row.unit,
		updatedAt: row.updatedAt.toISOString(),
	};
}
