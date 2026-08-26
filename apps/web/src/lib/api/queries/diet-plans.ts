import type {
	CreateDietPlanInput,
	DietPlanDetailDto,
	DietPlanDto,
	DietPlanListItemDto,
	ListDietPlansInput,
	PaginatedResponse,
	SortOrder,
	UpdateDietPlanInput,
} from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	dietPlanQueryKey,
	dietPlansQueryKey,
	type FoodCatalogScope,
} from "@/lib/api/query-keys";

/** Derived from the server's own schema, so a new sort column cannot drift. */
export type DietPlanSortBy = NonNullable<ListDietPlansInput["sortBy"]>;

/** The request body for `PATCH /diet-plans/:id` — the route id travels in the path. */
export type DietPlanUpdateBody = Omit<UpdateDietPlanInput, "dietPlanId">;

/** One entry of that body's `update` array: a slot patch. */
export type DietPlanSlotPatch = NonNullable<
	DietPlanUpdateBody["update"]
>[number];

/** One entry of that body's `add` array: a new slot. */
export type DietPlanSlotAdd = NonNullable<DietPlanUpdateBody["add"]>[number];

export interface DietPlansQueryFilters {
	page: number;
	perPage: number;
	q: string;
	sortBy: DietPlanSortBy;
	sortOrder: SortOrder;
}

interface DietPlanResponse {
	data: DietPlanDto;
}

interface DietPlanDetailResponse {
	data: DietPlanDetailDto;
}

/** `admin` and `nutritionist` are the same endpoints behind different guards. */
function dietPlansPath(scope: FoodCatalogScope): string {
	return `/api/${scope}/diet-plans`;
}

function dietPlanPath(scope: FoodCatalogScope, dietPlanId: string): string {
	return `${dietPlansPath(scope)}/${encodeURIComponent(dietPlanId)}`;
}

function dietPlansSearchParams(filters: DietPlansQueryFilters): string {
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

/** Rows carry `slotCount`, computed server-side by a LEFT JOIN + GROUP BY. */
export function dietPlansQueryOptions(
	scope: FoodCatalogScope,
	filters: DietPlansQueryFilters
) {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<PaginatedResponse<DietPlanListItemDto>>(
				`${dietPlansPath(scope)}?${dietPlansSearchParams(filters)}`
			),
		queryKey: dietPlansQueryKey(scope, filters),
	});
}

/** The detail read adds every slot and the meal lines each slot resolves to. */
export function dietPlanQueryOptions(
	scope: FoodCatalogScope,
	dietPlanId: string
) {
	return queryOptions({
		enabled: dietPlanId.length > 0,
		queryFn: async () => {
			const response = await fetchApiJson<DietPlanDetailResponse>(
				dietPlanPath(scope, dietPlanId)
			);
			return response.data;
		},
		queryKey: dietPlanQueryKey(scope, dietPlanId),
	});
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createDietPlan(
	scope: FoodCatalogScope,
	input: CreateDietPlanInput
): Promise<DietPlanDto> {
	const response = await fetchApiJson<DietPlanResponse>(dietPlansPath(scope), {
		body: JSON.stringify(input),
		method: "POST",
	});
	return response.data;
}

/**
 * Metadata and slot mutations travel in one PATCH, applied in FK-safe order
 * (metadata -> remove -> patch -> add) inside a single transaction.
 *
 * Answers **409** when the plan has *any* assignment: an assigned plan is
 * immutable, because consumption rows, meal-time overrides and food swaps all
 * point at its slots (`docs/migration/api-surface.md` §8.9). Cloning is the
 * supported way to change one.
 *
 * The response is the **full detail** DTO, not the bare header.
 */
export async function updateDietPlan(
	scope: FoodCatalogScope,
	dietPlanId: string,
	body: DietPlanUpdateBody
): Promise<DietPlanDetailDto> {
	const response = await fetchApiJson<DietPlanDetailResponse>(
		dietPlanPath(scope, dietPlanId),
		{ body: JSON.stringify(body), method: "PATCH" }
	);
	return response.data;
}

/** **409** when the plan has any assignment — assigned plans are undeletable. */
export async function deleteDietPlan(
	scope: FoodCatalogScope,
	dietPlanId: string
): Promise<DietPlanDto> {
	const response = await fetchApiJson<DietPlanResponse>(
		dietPlanPath(scope, dietPlanId),
		{ method: "DELETE" }
	);
	return response.data;
}
