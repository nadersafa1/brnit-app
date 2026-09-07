import type { SortOrder } from "@brnit/api";
import {
	DEFAULT_PER_PAGE,
	MAX_PER_PAGE,
	PAGE_SIZE_OPTIONS,
} from "@brnit/api/pagination/offset";
import type { SearchSchemaInput } from "@tanstack/react-router";

import {
	DEFAULT_FOOD_ITEM_SORT_BY,
	DEFAULT_FOOD_ITEM_SORT_ORDER,
	FOOD_ITEM_SORT_OPTIONS,
	type FoodItemSortBy,
} from "@/lib/api/queries/food-items";

export interface FoodItemsSearch {
	categoryId: string;
	page: number;
	perPage: number;
	q: string;
	sortBy: FoodItemSortBy;
	sortOrder: SortOrder;
}

const FIRST_PAGE = 1;
const MAX_SEARCH_LENGTH = 100;

function parsePositiveInt(value: unknown, fallback: number): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < FIRST_PAGE) {
		return fallback;
	}
	return parsed;
}

function parsePerPage(value: unknown): number {
	const parsed = parsePositiveInt(value, DEFAULT_PER_PAGE);
	// Anything outside the offered sizes is coerced back, so a hand-edited URL
	// cannot ask for a page size the table has no control for — or one the
	// server would reject with a 400.
	return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) &&
		parsed <= MAX_PER_PAGE
		? parsed
		: DEFAULT_PER_PAGE;
}

function parseSortBy(value: unknown): FoodItemSortBy {
	return (FOOD_ITEM_SORT_OPTIONS as readonly string[]).includes(value as string)
		? (value as FoodItemSortBy)
		: DEFAULT_FOOD_ITEM_SORT_BY;
}

function parseSortOrder(value: unknown): SortOrder {
	return value === "asc" || value === "desc"
		? value
		: DEFAULT_FOOD_ITEM_SORT_ORDER;
}

/**
 * `validateSearch` for the food-item lists.
 *
 * The whole table state lives in the URL, which is what makes a filtered page
 * shareable, survivable across a refresh, and correct when the browser's back
 * button walks through it. Every value is defaulted rather than rejected: a
 * malformed `?page=abc` should show page 1, not an error screen.
 *
 * The `SearchSchemaInput` marker on the parameter is what separates the
 * navigation **input** type from the parsed **output** type: without it every
 * `<Link to="/dashboard/admin/food-items">` would have to spell out all six
 * params, even though the whole point is that they default.
 */
export function parseFoodItemsSearch(
	search: Record<string, unknown> & SearchSchemaInput
): FoodItemsSearch {
	return {
		categoryId: typeof search.categoryId === "string" ? search.categoryId : "",
		page: parsePositiveInt(search.page, FIRST_PAGE),
		perPage: parsePerPage(search.perPage),
		q: typeof search.q === "string" ? search.q.slice(0, MAX_SEARCH_LENGTH) : "",
		sortBy: parseSortBy(search.sortBy),
		sortOrder: parseSortOrder(search.sortOrder),
	};
}
