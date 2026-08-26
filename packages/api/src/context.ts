import type { IncomingHttpHeaders } from "node:http";

import type { auth } from "@brnit/auth";

import type { OrganizationContextDto } from "./organization/context";

/**
 * Handler context — the `ctx` half of `(ctx, input) => Promise<Dto>`.
 *
 * Every handler in this package takes one. It carries the resolved identity and
 * organization scope, so handlers never reach for Express, Next.js, or
 * better-auth internals directly.
 *
 * **Handlers must still re-assert authorization.** The server's route guards
 * populate this context, but a handler that trusts them blindly becomes unsafe
 * the moment someone mounts it behind a different guard, or calls it from a job.
 * Treat the context as *identity*, not as *permission*.
 */

type InferredSession = typeof auth.$Infer.Session;

/** better-auth session user, including the admin plugin's role and ban fields. */
export type SessionUser = InferredSession["user"];

/** better-auth session row, including `activeOrganizationId`. */
export type SessionRecord = InferredSession["session"];

/**
 * What the server's auth middleware attaches to `req.auth`.
 *
 * `user` and `session` are set by `requireSession`. The organization fields are
 * populated only by the guards that resolve them, so consumers must treat them
 * as optional — a controller mounted without an org-aware guard sees `undefined`.
 */
export interface RequestAuthForContext {
	/** `member.id` for the resolved organization — set by `requireMemberOrg`. */
	memberId?: string;
	/** Resolved organization scope — set by the org-aware guards. */
	organization?: OrganizationContextDto;
	/** The organization this request was authorized against. */
	organizationId?: string;
	session: SessionRecord;
	user: SessionUser;
}

export interface Context {
	headers: IncomingHttpHeaders;
	/** `member.id` for the resolved organization, when a guard resolved one. */
	memberId: string | null;
	organization: OrganizationContextDto | null;
	organizationId: string | null;
	session: SessionRecord | null;
	user: SessionUser | null;
}

export interface CreateContextInput {
	auth?: RequestAuthForContext;
	headers: IncomingHttpHeaders;
}

/**
 * Builds a {@link Context} from what the auth middleware already resolved.
 *
 * Deliberately synchronous and side-effect free: the guards have already hit
 * the session store and the `member` table, so re-fetching here would double
 * every authenticated request's query count. A request that skipped the guards
 * simply yields an anonymous context.
 */
export function createContextFromRequest({
	auth: requestAuth,
	headers,
}: CreateContextInput): Context {
	return {
		headers,
		memberId: requestAuth?.memberId ?? null,
		organization: requestAuth?.organization ?? null,
		organizationId:
			requestAuth?.organizationId ??
			requestAuth?.organization?.activeOrgId ??
			null,
		session: requestAuth?.session ?? null,
		user: requestAuth?.user ?? null,
	};
}

/** Narrows a context to one that definitely has an authenticated user. */
export function requireContextUser(ctx: Context): SessionUser {
	if (!ctx.user) {
		throw new Error(
			"Handler requires an authenticated context but none was present — check the route's guards"
		);
	}
	return ctx.user;
}
