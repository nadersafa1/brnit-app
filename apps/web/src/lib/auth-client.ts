import {
	ac,
	client_admin,
	coach,
	direct_admin,
	member,
	nutritionist,
	owner,
} from "@brnit/auth/permissions";
import { env } from "@brnit/env/web";
import {
	adminClient,
	inferAdditionalFields,
	organizationClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * The better-auth browser client.
 *
 * `baseURL` is the **API origin**, not this app's origin: better-auth is
 * mounted on `apps/server` at the unversioned `/api/auth/*` (the client appends
 * that path itself), and the SPA is served from a different host. Session
 * cookies therefore travel cross-origin, which is why every request the client
 * makes — and every request `lib/api/client.ts` makes — sends credentials.
 *
 * The organization plugin is configured with the **same** `ac` and role objects
 * the server passes to `organization()` in `@brnit/auth`. They are a shared
 * contract: if the two sides drift, `authClient.organization.hasPermission`
 * starts answering questions the server will refuse.
 *
 * `adminClient()` takes no `ac` on purpose — the server registers
 * `admin({ defaultRole })` with better-auth's default statements, so passing a
 * custom access-control here would be the drift it is meant to prevent.
 */
export const authClient = createAuthClient({
	baseURL: env.VITE_SERVER_URL,
	plugins: [
		adminClient(),
		organizationClient({
			ac,
			roles: {
				client_admin,
				coach,
				direct_admin,
				member,
				nutritionist,
				owner,
			},
		}),
		// Mirrors `user.additionalFields.dob` in the server config. Without it the
		// client types drop `dob`, and the profile gate below cannot see it.
		inferAdditionalFields({
			user: {
				dob: { required: false, type: "date" },
			},
		}),
	],
});

export type Session = typeof authClient.$Infer.Session;
export type SessionUser = Session["user"];
export type Invitation = typeof authClient.$Infer.Invitation;
export type Member = typeof authClient.$Infer.Member;
export type Organization = typeof authClient.$Infer.Organization;
