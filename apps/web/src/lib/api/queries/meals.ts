import type {
	CreateMealInput,
	ListMealsInput,
	MealDetailDto,
	MealDto,
	PaginatedResponse,
	SortOrder,
	UpdateMealInput,
} from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	type FoodCatalogScope,
	mealQueryKey,
	mealsQueryKey,
} from "@/lib/api/query-keys";

/** Derived from the server's own schema, so a new sort column cannot drift. */
export type MealSortBy = NonNullable<ListMealsInput["sortBy"]>;

/** The request body for `PATCH /meals/:id` — the route id travels in the path. */
export type MealUpdateBody = Omit<UpdateMealInput, "mealId">;

export interface MealsQueryFilters {
	page: number;
	perPage: number;
	q: string;
	sortBy: MealSortBy;
	sortOrder: SortOrder;
}

interface MealResponse {
	data: MealDto;
}

interface MealDetailResponse {
	data: MealDetailDto;
}

/** `admin` and `nutritionist` are the same endpoints behind different guards. */
function mealsPath(scope: FoodCatalogScope): string {
	return `/api/${scope}/meals`;
}

function mealPath(scope: FoodCatalogScope, mealId: string): string {
	return `${mealsPath(scope)}/${encodeURIComponent(mealId)}`;
}

function mealsSearchParams(filters: MealsQueryFilters): string {
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

export function mealsQueryOptions(
	scope: FoodCatalogScope,
	filters: MealsQueryFilters
) {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<PaginatedResponse<MealDto>>(
				`${mealsPath(scope)}?${mealsSearchParams(filters)}`
			),
		queryKey: mealsQueryKey(scope, filters),
	});
}

/**
 * The detail read carries `mealItems[]`; the list read does not. They live
 * under different key roots so a list refresh never overwrites the heavier
 * detail entry with a header-only row.
 */
export function mealQueryOptions(scope: FoodCatalogScope, mealId: string) {
	return queryOptions({
		enabled: mealId.length > 0,
		queryFn: async () => {
			const response = await fetchApiJson<MealDetailResponse>(
				mealPath(scope, mealId)
			);
			return response.data;
		},
		queryKey: mealQueryKey(scope, mealId),
	});
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createMeal(
	scope: FoodCatalogScope,
	input: CreateMealInput
): Promise<MealDto> {
	const response = await fetchApiJson<MealResponse>(mealsPath(scope), {
		body: JSON.stringify(input),
		method: "POST",
	});
	return response.data;
}

/**
 * Metadata and line items travel in the **same** PATCH: `add`, `remove` and
 * `update` are applied in one transaction, which is why the meal editor never
 * issues two requests for one intent.
 *
 * Answers **409** when the meal belongs to a plan that has any assignment —
 * members are already eating from it (`docs/migration/api-surface.md` §4).
 */
export async function updateMeal(
	scope: FoodCatalogScope,
	mealId: string,
	body: MealUpdateBody
): Promise<MealDto> {
	const response = await fetchApiJson<MealResponse>(mealPath(scope, mealId), {
		body: JSON.stringify(body),
		method: "PATCH",
	});
	return response.data;
}

/**
 * Server-side clone. The name is built by the API as `"{name} clone"`,
 * truncated so the total stays within the 255-character `meal.name` limit —
 * `@brnit/api`'s `buildClonedMealName` owns that rule, and no client re-derives
 * it. The clone belongs to no diet plan.
 */
export async function cloneMeal(
	scope: FoodCatalogScope,
	mealId: string
): Promise<MealDto> {
	const response = await fetchApiJson<MealResponse>(
		`${mealPath(scope, mealId)}/clone`,
		{ method: "POST" }
	);
	return response.data;
}

/** **409** when the meal still holds items, or a diet-plan slot references it. */
export async function deleteMeal(
	scope: FoodCatalogScope,
	mealId: string
): Promise<MealDto> {
	const response = await fetchApiJson<MealResponse>(mealPath(scope, mealId), {
		method: "DELETE",
	});
	return response.data;
}
