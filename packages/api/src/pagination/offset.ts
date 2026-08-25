/**
 * Offset pagination.
 *
 * brnit's clients page by number, not by cursor — the web tables render page
 * controls and the native lists request explicit pages. The reference repo
 * (qpadel) uses cursor pagination; that is deliberately NOT adopted here, since
 * changing the shape would break every existing consumer.
 */

/** Default page size. Mirrors the web tables' default. */
export const DEFAULT_PER_PAGE = 25;

/** Page sizes the web tables offer. */
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

/** Hard ceiling on `perPage`, enforced by the query schema. */
export const MAX_PER_PAGE = 100;

export interface PaginationMeta {
	page: number;
	perPage: number;
	totalItems: number;
	totalPages: number;
}

export type PaginatedResponse<T, TDataKey extends string = "data"> = {
	pagination: PaginationMeta;
} & Record<TDataKey, T[]>;

/** Zero-based SQL offset for a 1-based page number. */
export function calculateOffset(page: number, perPage: number): number {
	return (page - 1) * perPage;
}

/**
 * Wraps a page of rows in the response envelope every list endpoint returns.
 *
 * `totalPages` is 0 when there are no items, so clients can distinguish "empty"
 * from "one empty page".
 */
export function createPaginatedResponse<T, TDataKey extends string = "data">(
	items: T[],
	page: number,
	perPage: number,
	totalItems: number,
	options?: { dataKey?: TDataKey }
): PaginatedResponse<T, TDataKey> {
	const totalPages = perPage > 0 ? Math.ceil(totalItems / perPage) : 0;
	const dataKey = (options?.dataKey ?? "data") as TDataKey;
	const pagination: PaginationMeta = {
		page,
		perPage,
		totalItems,
		totalPages,
	};
	return {
		[dataKey]: items,
		pagination,
	} as PaginatedResponse<T, TDataKey>;
}
