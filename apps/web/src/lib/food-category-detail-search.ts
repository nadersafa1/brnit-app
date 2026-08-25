import type { SearchSchemaInput } from "@tanstack/react-router";

import { parseDeleteFlagSearch } from "@/lib/delete-flag-search";
import {
	type FoodItemsSearch,
	parseFoodItemsSearch,
} from "@/lib/food-items-search";

/**
 * `validateSearch` for `/dashboard/admin/categories/$foodCategoryId`.
 *
 * The page carries two independent pieces of URL state and both belong there:
 * the food-item table's own paging and sorting, and the `?delete` flag the
 * list's row action deep-links with. Composing the two existing parsers keeps
 * either rule in one place — `categoryId` is *not* among them, because the
 * category is the path parameter.
 */
export type FoodCategoryDetailSearch = FoodItemsSearch & { delete: boolean };

export function parseFoodCategoryDetailSearch(
	search: Record<string, unknown> & SearchSchemaInput
): FoodCategoryDetailSearch {
	return {
		...parseFoodItemsSearch(search),
		...parseDeleteFlagSearch(search),
	};
}
