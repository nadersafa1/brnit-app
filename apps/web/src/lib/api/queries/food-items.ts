import type {
	DeletedFoodItemResponse,
	FoodItemDto,
	FoodItemListResponse,
	FoodItemResponse,
	ListFoodItemsInput,
	SortOrder,
} from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	type FoodCatalogScope,
	foodItemQueryKey,
	foodItemsQueryKey,
} from "@/lib/api/query-keys";

/** Derived from the server's own schema, so a new sort column cannot drift. */
export type FoodItemSortBy = NonNullable<ListFoodItemsInput["sortBy"]>;

export const FOOD_ITEM_SORT_OPTIONS = [
	"createdAt",
	"name",
	"calories",
	"protein",
	"carbs",
	"fat",
] as const satisfies readonly FoodItemSortBy[];

export const DEFAULT_FOOD_ITEM_SORT_BY: FoodItemSortBy = "createdAt";
export const DEFAULT_FOOD_ITEM_SORT_ORDER: SortOrder = "desc";

export interface FoodItemsQueryFilters {
	/** `""` means "all categories" — an empty param is never sent. */
	categoryId: string;
	page: number;
	perPage: number;
	q: string;
	sortBy: FoodItemSortBy;
	sortOrder: SortOrder;
}

/** `admin` and `nutritionist` serve identical reads behind different guards. */
function foodItemsPath(scope: FoodCatalogScope): string {
	return `/api/${scope}/food-items`;
}

function foodItemPath(scope: FoodCatalogScope, foodItemId: string): string {
	return `${foodItemsPath(scope)}/${encodeURIComponent(foodItemId)}`;
}

function foodItemsSearchParams(filters: FoodItemsQueryFilters): string {
	const params = new URLSearchParams({
		page: String(filters.page),
		perPage: String(filters.perPage),
		sortBy: filters.sortBy,
		sortOrder: filters.sortOrder,
	});
	const trimmedQuery = filters.q.trim();
	if (trimmedQuery.length > 0) {
		params.set("q", trimmedQuery);
	}
	if (filters.categoryId.length > 0) {
		params.set("categoryId", filters.categoryId);
	}
	return params.toString();
}

export function foodItemsQueryOptions(
	scope: FoodCatalogScope,
	filters: FoodItemsQueryFilters
) {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<FoodItemListResponse>(
				`${foodItemsPath(scope)}?${foodItemsSearchParams(filters)}`
			),
		queryKey: foodItemsQueryKey(scope, filters),
	});
}

export function foodItemQueryOptions(
	scope: FoodCatalogScope,
	foodItemId: string
) {
	return queryOptions({
		enabled: foodItemId.length > 0,
		queryFn: async () => {
			const response = await fetchApiJson<FoodItemResponse>(
				foodItemPath(scope, foodItemId)
			);
			return response.data;
		},
		queryKey: foodItemQueryKey(scope, foodItemId),
	});
}

// ---------------------------------------------------------------------------
// Writes — admin only, and always multipart
// ---------------------------------------------------------------------------

/**
 * The write endpoints parse `multipart/form-data`, not JSON: the image travels
 * in the same request as the fields, so every value is serialised to a string
 * and the server's schema coerces it back. There is no JSON variant.
 */
export interface FoodItemWriteFields {
	calories: number;
	carbs: number;
	categoryIds: readonly string[];
	fat: number;
	gramsPerUnit: number | null;
	name: string;
	protein: number;
	unit: string;
}

export interface FoodItemImageOptions {
	/** Deletes the stored image. Ignored when a replacement `file` is supplied. */
	clearImage?: boolean;
	file?: File | null;
}

function appendFoodItemFields(
	formData: FormData,
	fields: FoodItemWriteFields
): void {
	formData.append("name", fields.name);
	// Repeated keys, not a JSON array: `categoryIds[]` is what multer/zod expect.
	for (const categoryId of fields.categoryIds) {
		formData.append("categoryIds", categoryId);
	}
	formData.append("calories", String(fields.calories));
	formData.append("protein", String(fields.protein));
	formData.append("carbs", String(fields.carbs));
	formData.append("fat", String(fields.fat));
	formData.append("unit", fields.unit);
	if (fields.gramsPerUnit !== null) {
		formData.append("gramsPerUnit", String(fields.gramsPerUnit));
	}
}

export function buildFoodItemFormData(
	fields: FoodItemWriteFields,
	image?: FoodItemImageOptions
): FormData {
	const formData = new FormData();
	appendFoodItemFields(formData, fields);
	if (image?.file) {
		formData.append("file", image.file);
	} else if (image?.clearImage) {
		formData.append("clearImage", "true");
	}
	return formData;
}

export async function createFoodItem(
	fields: FoodItemWriteFields,
	image?: FoodItemImageOptions
): Promise<FoodItemDto> {
	const response = await fetchApiJson<FoodItemResponse>(
		foodItemsPath("admin"),
		{ body: buildFoodItemFormData(fields, image), method: "POST" }
	);
	return response.data;
}

export async function updateFoodItem(
	foodItemId: string,
	fields: FoodItemWriteFields,
	image?: FoodItemImageOptions
): Promise<FoodItemDto> {
	const response = await fetchApiJson<FoodItemResponse>(
		foodItemPath("admin", foodItemId),
		{ body: buildFoodItemFormData(fields, image), method: "PATCH" }
	);
	return response.data;
}

export function deleteFoodItem(
	foodItemId: string
): Promise<DeletedFoodItemResponse> {
	return fetchApiJson<DeletedFoodItemResponse>(
		foodItemPath("admin", foodItemId),
		{ method: "DELETE" }
	);
}
