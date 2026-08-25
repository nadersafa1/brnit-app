/**
 * `@brnit/api` — the single source of truth for the HTTP contract.
 *
 * Server controllers import handlers from here; the web and native apps import
 * only types, zod schemas and pure helpers. Client code must never reach into
 * `./handlers/*` or `./db/*`, which pull in Drizzle.
 *
 * This barrel is intentional — `noBarrelFile` is disabled for it in biome.json.
 */

export type {
	Context,
	CreateContextInput,
	RequestAuthForContext,
	SessionRecord,
	SessionUser,
} from "./context";
export { createContextFromRequest, requireContextUser } from "./context";
export type { ApiErrorBody } from "./http-error";
export { HttpError } from "./http-error";
export type {
	PaginatedResponse,
	PaginationMeta,
} from "./pagination/offset";
export {
	calculateOffset,
	createPaginatedResponse,
	DEFAULT_PER_PAGE,
	MAX_PER_PAGE,
	PAGE_SIZE_OPTIONS,
} from "./pagination/offset";
export type {
	PaginationQuery,
	SortOrder,
	SortQuery,
	TextSearchQuery,
} from "./pagination/query-params";
export {
	pageSchema,
	paginationQueryInput,
	paginationQuerySchema,
	perPageSchema,
	queryParam,
	sortOrderSchema,
	sortQuerySchema,
	textSearchQuerySchema,
	textSearchSchema,
} from "./pagination/query-params";
export type {
	OrganizationContextDto,
	OrganizationSummary,
} from "./organization/context";
export {
	ANONYMOUS_ORGANIZATION_CONTEXT,
	organizationRoleFlags,
} from "./organization/context";
