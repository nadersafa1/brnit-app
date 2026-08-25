import type { SortOrder } from "@brnit/api";
import {
	DEFAULT_PER_PAGE,
	MAX_PER_PAGE,
	PAGE_SIZE_OPTIONS,
} from "@brnit/api/pagination/offset";
import type { SearchSchemaInput } from "@tanstack/react-router";

/**
 * `validateSearch` for the three catalog lists that page, search and sort
 * identically — food categories, meals and diet plans.
 *
 * One parser rather than three copies: the server gives all three the same
 * `sortBy: name|createdAt` contract (`docs/migration/api-surface.md` §4), so a
 * fourth column added to one of them is a change to this module, not a hunt
 * through the routes. Food items keep their own parser because they also carry
 * a `categoryId` filter and a wider sort set.
 *
 * Every value is defaulted rather than rejected: a hand-edited `?page=abc`
 * should show page 1, not an error screen.
 */

export const CATALOG_SORT_OPTIONS = ["name", "createdAt"] as const;

export type CatalogSortBy = (typeof CATALOG_SORT_OPTIONS)[number];

/** Legacy parity: these lists opened alphabetically, not newest-first. */
export const DEFAULT_CATALOG_SORT_BY: CatalogSortBy = "name";
export const DEFAULT_CATALOG_SORT_ORDER: SortOrder = "asc";

export interface CatalogListSearch {
	page: number;
	perPage: number;
	q: string;
	sortBy: CatalogSortBy;
	sortOrder: SortOrder;
}

const FIRST_PAGE = 1;
/** The server trims and caps `q` at the same length. */
const MAX_SEARCH_LENGTH = 100;

export function parsePageNumber(value: unknown, fallback: number): number {
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < FIRST_PAGE) {
		return fallback;
	}
	return parsed;
}

/**
 * Anything outside the offered sizes is coerced back, so a hand-edited URL
 * cannot ask for a page size the table has no control for — or one the server
 * would reject with a 400.
 */
export function parsePerPage(value: unknown): number {
	const parsed = parsePageNumber(value, DEFAULT_PER_PAGE);
	return (PAGE_SIZE_OPTIONS as readonly number[]).includes(parsed) &&
		parsed <= MAX_PER_PAGE
		? parsed
		: DEFAULT_PER_PAGE;
}

export function parseSearchText(value: unknown): string {
	return typeof value === "string" ? value.slice(0, MAX_SEARCH_LENGTH) : "";
}

export function parseSortOrder(value: unknown, fallback: SortOrder): SortOrder {
	return value === "asc" || value === "desc" ? value : fallback;
}

function parseCatalogSortBy(value: unknown): CatalogSortBy {
	return (CATALOG_SORT_OPTIONS as readonly string[]).includes(value as string)
		? (value as CatalogSortBy)
		: DEFAULT_CATALOG_SORT_BY;
}

/**
 * The `SearchSchemaInput` marker on the parameter separates the navigation
 * **input** type from the parsed **output** type: without it every
 * `<Link to="/dashboard/admin/meals">` would have to spell out all five params,
 * even though the whole point is that they default.
 */
export function parseCatalogListSearch(
	search: Record<string, unknown> & SearchSchemaInput
): CatalogListSearch {
	return {
		page: parsePageNumber(search.page, FIRST_PAGE),
		perPage: parsePerPage(search.perPage),
		q: parseSearchText(search.q),
		sortBy: parseCatalogSortBy(search.sortBy),
		sortOrder: parseSortOrder(search.sortOrder, DEFAULT_CATALOG_SORT_ORDER),
	};
}
