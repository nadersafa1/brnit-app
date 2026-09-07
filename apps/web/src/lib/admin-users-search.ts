import type { SortOrder } from "@brnit/api";
import { APP_ROLES } from "@brnit/domain";
import type { SearchSchemaInput } from "@tanstack/react-router";

import {
	parsePageNumber,
	parsePerPage,
	parseSearchText,
	parseSortOrder,
} from "@/lib/catalog-list-search";

/**
 * `validateSearch` for `/dashboard/admin`.
 *
 * The users list is served by better-auth's admin plugin rather than by
 * `apps/server`, but the table state belongs in the URL for exactly the same
 * reasons as every other list: a filtered view is shareable, survives a
 * refresh, and the back button walks through it.
 */

const ADMIN_USERS_SORT_OPTIONS = [
	"name",
	"email",
	"role",
	"createdAt",
] as const;

export type AdminUsersSortBy = (typeof ADMIN_USERS_SORT_OPTIONS)[number];

const DEFAULT_ADMIN_USERS_SORT_BY: AdminUsersSortBy = "createdAt";
const DEFAULT_ADMIN_USERS_SORT_ORDER: SortOrder = "desc";

export interface AdminUsersSearch {
	page: number;
	perPage: number;
	q: string;
	/** `""` means "every role" — an empty filter is never sent to the API. */
	role: string;
	sortBy: AdminUsersSortBy;
	sortOrder: SortOrder;
}

const FIRST_PAGE = 1;

function parseSortBy(value: unknown): AdminUsersSortBy {
	return (ADMIN_USERS_SORT_OPTIONS as readonly string[]).includes(
		value as string
	)
		? (value as AdminUsersSortBy)
		: DEFAULT_ADMIN_USERS_SORT_BY;
}

/** Only the app roles `@brnit/domain` knows about; anything else is "every role". */
function parseRole(value: unknown): string {
	return (APP_ROLES as readonly string[]).includes(value as string)
		? (value as string)
		: "";
}

export function parseAdminUsersSearch(
	search: Record<string, unknown> & SearchSchemaInput
): AdminUsersSearch {
	return {
		page: parsePageNumber(search.page, FIRST_PAGE),
		perPage: parsePerPage(search.perPage),
		q: parseSearchText(search.q),
		role: parseRole(search.role),
		sortBy: parseSortBy(search.sortBy),
		sortOrder: parseSortOrder(search.sortOrder, DEFAULT_ADMIN_USERS_SORT_ORDER),
	};
}
