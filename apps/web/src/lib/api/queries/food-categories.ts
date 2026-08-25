import type { FoodCategoryListResponse } from "@brnit/api";
import { MAX_PER_PAGE } from "@brnit/api/pagination/offset";
import { queryOptions } from "@tanstack/react-query";

import { fetchApiJson } from "@/lib/api/client";
import {
	type FoodCatalogScope,
	foodCategoriesQueryKey,
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
