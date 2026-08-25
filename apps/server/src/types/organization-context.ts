/**
 * brnit's organization model, re-exported for server-local use.
 *
 * App roles live on `user.role` (better-auth admin plugin); organization roles
 * live on `member.role`. The two are independent: an app `admin` has no
 * `member` row and therefore no organization role, while an organization
 * `owner` may be a plain app `user`.
 *
 * The definitions themselves live upstream so there is exactly one copy:
 * - roles and their predicates in `@brnit/domain` (framework-free, shared with
 *   the web and native clients)
 * - the resolved context shape in `@brnit/api`, because it is serialized
 *   verbatim by `GET /api/v1/users/me/organization-context` and is therefore a
 *   client contract, not an internal type
 */

export type {
	OrganizationContextDto as OrganizationContext,
	OrganizationSummary,
} from "@brnit/api";
export { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api";
export type { AppRole, OrganizationRole } from "@brnit/domain";
export {
	APP_ROLES,
	isAppRole,
	isOrganizationRole,
	ORGANIZATION_ROLES,
} from "@brnit/domain";
