import type { PaginationMeta, SortOrder } from "@brnit/api";
import { queryOptions } from "@tanstack/react-query";
import type { AdminUsersSortBy } from "@/lib/admin-users-search";
import { adminUsersQueryKey } from "@/lib/api/query-keys";
import { authClient } from "@/lib/auth-client";

/**
 * The users list is the one admin screen that is **not** served by
 * `apps/server`: better-auth owns `user`, so `/api/auth/admin/*` is the only
 * place these reads and writes exist. `authClient` therefore stands in for
 * `fetchApiJson` here, and the `{ data, error }` envelope it answers with is
 * turned into a thrown `Error` so TanStack Query sees a failure like any other.
 */

type ListUsersResult = Awaited<ReturnType<typeof authClient.admin.listUsers>>;

/** better-auth's `UserWithRole`, taken from the client so it cannot drift. */
export type AdminUser = NonNullable<ListUsersResult["data"]>["users"][number];

export interface AdminUsersQueryFilters {
	page: number;
	perPage: number;
	q: string;
	/** `""` means "every role"; the filter params are omitted entirely. */
	role: string;
	sortBy: AdminUsersSortBy;
	sortOrder: SortOrder;
}

export interface AdminUsersPage {
	pagination: PaginationMeta;
	users: readonly AdminUser[];
}

const FIRST_PAGE = 1;

/**
 * `adminUsersQueryKey` covers page, page size and the search text. The role
 * filter and the sort are appended here because they also change the rows, and
 * two filters sharing one cache entry would show the wrong list.
 *
 * The prefix stays `["admin-users", …]`, so `adminUsersQueries()` still
 * invalidates every variant. **`lib/api/query-keys.ts` should grow `role`,
 * `sortBy` and `sortOrder` segments of its own** — this local extension is the
 * stopgap, not the pattern.
 */
function adminUsersFullQueryKey(filters: AdminUsersQueryFilters) {
	return [
		...adminUsersQueryKey({
			page: filters.page,
			perPage: filters.perPage,
			q: filters.q,
		}),
		filters.role,
		filters.sortBy,
		filters.sortOrder,
	] as const;
}

interface AuthClientResult<TData> {
	data: TData | null;
	error: { message?: string | null } | null;
}

/** better-auth resolves rather than rejects; this restores normal error flow. */
function unwrapAuthResult<TData>(
	result: AuthClientResult<TData>,
	fallbackMessage: string
): TData {
	if (result.error) {
		throw new Error(result.error.message || fallbackMessage);
	}
	if (result.data === null) {
		throw new Error(fallbackMessage);
	}
	return result.data;
}

/**
 * better-auth pages by `limit`/`offset` and answers `{ users, total }`, so the
 * page number and the `{ page, perPage, totalItems, totalPages }` meta the
 * shared table controls expect are computed here — one adapter, rather than
 * two pagination vocabularies inside the page component.
 */
function toPaginationMeta(
	filters: AdminUsersQueryFilters,
	totalItems: number
): PaginationMeta {
	return {
		page: filters.page,
		perPage: filters.perPage,
		totalItems,
		totalPages: Math.ceil(totalItems / filters.perPage),
	};
}

async function fetchAdminUsers(
	filters: AdminUsersQueryFilters
): Promise<AdminUsersPage> {
	const trimmedQuery = filters.q.trim();
	const result = await authClient.admin.listUsers({
		query: {
			limit: filters.perPage,
			offset: (filters.page - FIRST_PAGE) * filters.perPage,
			sortBy: filters.sortBy,
			sortDirection: filters.sortOrder,
			// Email only, matching the pre-overhaul screen's search box.
			...(trimmedQuery.length > 0 && {
				searchField: "email" as const,
				searchOperator: "contains" as const,
				searchValue: trimmedQuery,
			}),
			...(filters.role.length > 0 && {
				filterField: "role",
				filterOperator: "eq" as const,
				filterValue: filters.role,
			}),
		},
	});

	const data = unwrapAuthResult(result, "Could not load users");
	return {
		pagination: toPaginationMeta(filters, data.total),
		users: data.users,
	};
}

export function adminUsersQueryOptions(filters: AdminUsersQueryFilters) {
	return queryOptions({
		meta: { showErrorToast: true },
		queryFn: () => fetchAdminUsers(filters),
		queryKey: adminUsersFullQueryKey(filters),
	});
}

// ---------------------------------------------------------------------------
// Writes — the better-auth admin plugin's own actions
// ---------------------------------------------------------------------------

/**
 * The client's `role` parameter is typed from better-auth's **default** role
 * set (`"admin" | "user"`), because `adminClient()` is registered without a
 * custom access-control object — deliberately, so it cannot drift from the
 * server (`lib/auth-client.ts`). brnit's app roles are the four in
 * `APP_ROLES`, and the endpoint validates `role` as a plain string, so the cast
 * widens the client type back to what the server actually accepts.
 */
type BetterAuthRole = Parameters<typeof authClient.admin.setRole>[0]["role"];

export async function setUserRole(userId: string, role: string): Promise<void> {
	const result = await authClient.admin.setRole({
		role: role as BetterAuthRole,
		userId,
	});
	unwrapAuthResult(result, "Could not update the role");
}

export async function banUser(userId: string): Promise<void> {
	const result = await authClient.admin.banUser({ userId });
	unwrapAuthResult(result, "Could not ban the user");
}

export async function unbanUser(userId: string): Promise<void> {
	const result = await authClient.admin.unbanUser({ userId });
	unwrapAuthResult(result, "Could not unban the user");
}

export async function removeUser(userId: string): Promise<void> {
	const result = await authClient.admin.removeUser({ userId });
	unwrapAuthResult(result, "Could not delete the user");
}

/**
 * Starts an impersonation session. The session cookie is replaced server-side,
 * so the caller must reload rather than navigate: every cached query still
 * holds the admin's data.
 */
export async function impersonateUser(userId: string): Promise<void> {
	const result = await authClient.admin.impersonateUser({ userId });
	unwrapAuthResult(result, "Could not impersonate the user");
}
