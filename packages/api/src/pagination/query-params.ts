import { z } from "zod";

import { DEFAULT_PER_PAGE, MAX_PER_PAGE } from "./offset";

/**
 * Shared query-parameter schemas for list endpoints.
 *
 * Values arrive as strings (or `undefined`) from `req.query`, so every schema
 * coerces rather than expecting numbers. Express can also hand back an array
 * when a parameter is repeated — controllers narrow to `string | undefined`
 * before parsing, so these schemas never see arrays.
 */

const MIN_PAGE = 1;
const MIN_PER_PAGE = 1;
const MAX_SEARCH_LENGTH = 100;

/** 1-based page number. */
export const pageSchema = z
	.string()
	.optional()
	.transform((value) => (value ? Number.parseInt(value, 10) : MIN_PAGE))
	.refine(
		(value) => Number.isInteger(value) && value >= MIN_PAGE,
		`page must be an integer >= ${MIN_PAGE}`
	);

/**
 * Page size.
 *
 * `limit` is accepted as an alias by {@link paginationQuerySchema}; this schema
 * handles the resolved value.
 */
export const perPageSchema = z
	.string()
	.optional()
	.transform((value) => (value ? Number.parseInt(value, 10) : DEFAULT_PER_PAGE))
	.refine(
		(value) =>
			Number.isInteger(value) && value >= MIN_PER_PAGE && value <= MAX_PER_PAGE,
		`perPage must be an integer between ${MIN_PER_PAGE} and ${MAX_PER_PAGE}`
	);

export const paginationQuerySchema = z.object({
	page: pageSchema,
	perPage: perPageSchema,
});

export const sortOrderSchema = z
	.enum(["asc", "desc"])
	.optional()
	.default("desc");

export const sortQuerySchema = z.object({
	sortOrder: sortOrderSchema,
});

export const textSearchSchema = z
	.string()
	.trim()
	.max(
		MAX_SEARCH_LENGTH,
		`Search query must be at most ${MAX_SEARCH_LENGTH} characters`
	)
	.optional();

export const textSearchQuerySchema = z.object({
	q: textSearchSchema,
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type SortOrder = z.infer<typeof sortOrderSchema>;
export type SortQuery = z.infer<typeof sortQuerySchema>;
export type TextSearchQuery = z.infer<typeof textSearchQuerySchema>;

/**
 * Narrows a raw `req.query` value to the `string | undefined` the schemas
 * expect. Express yields an array when a parameter is repeated; the first entry
 * wins, matching how the Next.js handlers behaved.
 */
export function queryParam(value: unknown): string | undefined {
	if (typeof value === "string") {
		return value;
	}
	if (Array.isArray(value) && typeof value[0] === "string") {
		return value[0];
	}
	return;
}

/**
 * Builds the object the pagination schemas parse, resolving the `limit` alias
 * for `perPage`. An explicit `perPage` wins over `limit`.
 */
export function paginationQueryInput(query: Record<string, unknown>): {
	page: string | undefined;
	perPage: string | undefined;
} {
	return {
		page: queryParam(query.page),
		perPage: queryParam(query.perPage) ?? queryParam(query.limit),
	};
}
