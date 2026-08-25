import type { auth } from "@brnit/auth";

import type { OrganizationContext } from "./organization-context.js";

type InferredSession = typeof auth.$Infer.Session;

/** Better Auth session user, including the admin plugin's `role` / ban fields. */
export type SessionUser = InferredSession["user"];

/** Better Auth session row, including the organization plugin's `activeOrganizationId`. */
export type SessionRecord = InferredSession["session"];

/**
 * What the auth middleware attaches to `req.auth`.
 *
 * `user` / `session` are set by `requireSession`. The org fields are filled in
 * only by the guards that resolve them, so downstream code must treat them as
 * optional: `requireNutritionist` and friends set `organization`, while
 * `requireMemberOrg` sets `memberId` + `organizationId`.
 */
export interface RequestAuth {
	/** `member.id` for the resolved organization — set by `requireMemberOrg`. */
	memberId?: string;
	/** Resolved org scope — set by the org-aware guards. */
	organization?: OrganizationContext;
	/** The organization the request was authorized against. */
	organizationId?: string;
	session: SessionRecord;
	user: SessionUser;
}
