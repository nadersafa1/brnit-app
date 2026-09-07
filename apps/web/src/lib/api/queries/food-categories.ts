import type {
	CreateFoodCategoryInput,
	FoodCategoryDto,
	FoodCategoryListResponse,
	FoodCategoryResponse,
	ListFoodCategoriesInput,
	SortOrder,
} from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	type FoodCatalogScope,
	foodCategoriesQueryKey,
	foodCategoryQueryKey,
} from "@/lib/api/query-keys";

/**
 * Categories are a small, slow-moving global catalog, so the pickers load one
 * full page rather than paging. `MAX_PER_PAGE` comes from the server's own
 * ceiling — asking for more is a 400.
 */
const CATEGORY_PICKER_FILTERS = {
	page: 1,
	perPage: MAX_PER_PAGE,
	q: "",
	sortBy: "name",
	sortOrder: "asc",
} as const;

const CATEGORY_PICKER_STALE_TIME_MS = 300_000;

/** Every category, sorted by name — for filter dropdowns and the form's checkboxes. */
export function foodCategoryPickerQueryOptions(scope: FoodCatalogScope) {
	return queryOptions({
		queryFn: () =>
			fetchApiJson<FoodCategoryListResponse>(
				`/api/${scope}/food-categories?page=1&perPage=${MAX_PER_PAGE}&sortBy=name&sortOrder=asc`
			),
		queryKey: foodCategoriesQueryKey(scope, CATEGORY_PICKER_FILTERS),
		staleTime: CATEGORY_PICKER_STALE_TIME_MS,
	});
}

// ---------------------------------------------------------------------------
// The paginated admin list, the detail read, and the writes
// ---------------------------------------------------------------------------

/** Derived from the server's own schema, so a new sort column cannot drift. */
export type FoodCategorySortBy = NonNullable<ListFoodCategoriesInput["sortBy"]>;

export interface FoodCategoriesQueryFilters {
	page: number;
	perPage: number;
	q: string;
	sortBy: FoodCategorySortBy;
	sortOrder: SortOrder;
}

/** `name` and `description` — the pair both create and update require. */
export type FoodCategoryWriteFields = CreateFoodCategoryInput;

function foodCategoriesPath(scope: FoodCatalogScope): string {
	return `/api/${scope}/food-categories`;
}

function foodCategoryPath(
	scope: FoodCatalogScope,
	foodCategoryId: string
): string {
	return `${foodCategoriesPath(scope)}/${encodeURIComponent(foodCategoryId)}`;
}

function foodCategoriesSearchParams(
	filters: FoodCategoriesQueryFilters
): string {
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
	return params.toString();
}

/** Search matches the name **or** the description (`api-surface.md` §4). */
export function foodCategoriesQueryOptions(
	scope: FoodCatalogScope,
	filters: FoodCategoriesQueryFilters
) {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<FoodCategoryListResponse>(
				`${foodCategoriesPath(scope)}?${foodCategoriesSearchParams(filters)}`
			),
		queryKey: foodCategoriesQueryKey(scope, filters),
	});
}

export function foodCategoryQueryOptions(
	scope: FoodCatalogScope,
	foodCategoryId: string
) {
	return queryOptions({
		enabled: foodCategoryId.length > 0,
		queryFn: async () => {
			const response = await fetchApiJson<FoodCategoryResponse>(
				foodCategoryPath(scope, foodCategoryId)
			);
			return response.data;
		},
		queryKey: foodCategoryQueryKey(scope, foodCategoryId),
	});
}

export async function createFoodCategory(
	fields: FoodCategoryWriteFields
): Promise<FoodCategoryDto> {
	const response = await fetchApiJson<FoodCategoryResponse>(
		foodCategoriesPath("admin"),
		{ body: JSON.stringify(fields), method: "POST" }
	);
	return response.data;
}

/** `name` is required on update too — this endpoint has never been a true PATCH. */
export async function updateFoodCategory(
	foodCategoryId: string,
	fields: FoodCategoryWriteFields
): Promise<FoodCategoryDto> {
	const response = await fetchApiJson<FoodCategoryResponse>(
		foodCategoryPath("admin", foodCategoryId),
		{ body: JSON.stringify(fields), method: "PATCH" }
	);
	return response.data;
}

/**
 * **409** while any food item is still filed under the category.
 *
 * Before the overhaul the `RESTRICT` FK surfaced as a 500; the rewrite checks
 * first and answers with a sentence naming the blocker
 * (`docs/migration/api-surface.md` §4).
 */
export async function deleteFoodCategory(
	foodCategoryId: string
): Promise<FoodCategoryDto> {
	const response = await fetchApiJson<FoodCategoryResponse>(
		foodCategoryPath("admin", foodCategoryId),
		{ method: "DELETE" }
	);
	return response.data;
}
