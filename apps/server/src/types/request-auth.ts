/**
 * What the auth middleware attaches to `req.auth`.
 *
 * The shape lives in `@brnit/api` so handlers can build a `Context` from it
 * without importing Express types; this module only re-exports it under the
 * server-local names the middleware and controllers use.
 *
 * `user` and `session` are set by `requireSession`. The organization fields are
 * populated only by the guards that resolve them, so downstream code must treat
 * them as optional: `requireNutritionist` and friends set `organization`, while
 * `requireMemberOrg` sets `memberId` + `organizationId`.
 */

export type {
	RequestAuthForContext as RequestAuth,
	SessionRecord,
	SessionUser,
} from "@brnit/api";
