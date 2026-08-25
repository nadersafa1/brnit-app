import type {
	DietPlanDetailDto,
	DietPlanDto,
	DietPlanListItemDto,
	PaginatedResponse,
} from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import { dietPlanQueryKey, dietPlansQueryKey } from "@/lib/api/query-keys";

/**
 * The diet-plan reads the assignment UI needs, all through the nutritionist
 * tree: the picker's list, and the detail read that supplies a plan's meal
 * slots (and therefore its default meal times) to the override editor.
 *
 * Plan authoring itself lives under `/dashboard/nutritionist/diet-plans`; what
 * is here is only what assigning a plan to a member requires.
 */

const DIET_PLANS_PATH = "/api/nutritionist/diet-plans";

/** Sorted by name and loaded whole, the same shape as the food-category picker. */
const PLAN_PICKER_FILTERS = {
	page: 1,
	perPage: MAX_PER_PAGE,
	q: "",
	sortBy: "name",
	sortOrder: "asc",
} as const;

const PLAN_PICKER_STALE_TIME_MS = 60_000;

export type DietPlanListResponse = PaginatedResponse<DietPlanListItemDto>;

export function dietPlanPickerQueryOptions() {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () =>
			fetchApiJson<DietPlanListResponse>(
				`${DIET_PLANS_PATH}?page=${PLAN_PICKER_FILTERS.page}&perPage=${PLAN_PICKER_FILTERS.perPage}&sortBy=name&sortOrder=asc`
			),
		queryKey: dietPlansQueryKey("nutritionist", PLAN_PICKER_FILTERS),
		staleTime: PLAN_PICKER_STALE_TIME_MS,
	});
}

/** The plan's slots — the override editor renders one time field per slot. */
export function dietPlanDetailQueryOptions(dietPlanId: string) {
	return queryOptions({
		enabled: dietPlanId.length > 0,
		queryFn: async () => {
			const response = await fetchApiJson<{ data: DietPlanDetailDto }>(
				`${DIET_PLANS_PATH}/${encodeURIComponent(dietPlanId)}`
			);
			return response.data;
		},
		queryKey: dietPlanQueryKey("nutritionist", dietPlanId),
	});
}

export interface CreateDietPlanInput {
	description?: string;
	name: string;
}

/**
 * Creates the plan header. Meal slots are added in the plan editor — this exists
 * so a nutritionist can start a plan from the member they are assigning it to.
 */
export async function createDietPlan(
	input: CreateDietPlanInput
): Promise<DietPlanDto> {
	const response = await fetchApiJson<{ data: DietPlanDto }>(DIET_PLANS_PATH, {
		body: JSON.stringify(input),
		method: "POST",
	});
	return response.data;
}
