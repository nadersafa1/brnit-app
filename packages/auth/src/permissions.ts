/**
 * Organization access control (`ac`) and the role objects the Better Auth
 * organization plugin is configured with.
 *
 * Org roles: `owner`, `client_admin`, `direct_admin`, `nutritionist`, `coach`,
 * `member`. See `docs/ROLES.md` for what each one means.
 *
 * This module is imported by BOTH the web and the native `authClient` to build
 * `organizationClient({ ac, roles })`. The client and the server must agree on
 * the statement sets exactly, so the exported names and their permissions are a
 * stable contract — do not rename or restructure them without changing both
 * clients in the same commit. It must also stay free of server-only imports
 * (no database, no env) so it can be bundled for the browser and for Metro.
 */
import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	memberAc,
	ownerAc,
} from "better-auth/plugins/organization/access";

export const ac = createAccessControl({
	...defaultStatements,
});

/** Organization creator. Full control over settings, members and invitations. */
export const owner = ac.newRole({
	...ownerAc.statements,
});

/**
 * Client-side org admin (e.g. HR). May invite, but only with the `member` role:
 * the access-control layer grants the invitation statements, and
 * `beforeCreateInvitation` then rejects any role above `member`.
 */
export const client_admin = ac.newRole({
	...adminAc.statements,
});

/**
 * Brnit staff, assigned by an app admin. Records InBody body-composition
 * readings, and may update or remove members.
 *
 * May invite with **any** role, including staff roles — `direct_admin` sits
 * alongside `owner` in `ORG_ROLES_CAN_INVITE`, which is what
 * `beforeCreateInvitation` enforces. The invitation statements are inherited
 * from `adminAc` rather than hand-listed so the two layers cannot drift: the
 * access-control check runs *before* the hook, so an empty `invitation` here
 * would block `direct_admin` outright and make the hook's branch dead code.
 */
export const direct_admin = ac.newRole({
	...memberAc.statements,
	member: ["update", "delete"],
	invitation: adminAc.statements.invitation,
});

/** Adds nutrition plans for the org. No member or invitation management. */
export const nutritionist = ac.newRole({
	...memberAc.statements,
	member: [],
	invitation: [],
});

/** Adds exercises for the org. No member or invitation management. */
export const coach = ac.newRole({
	...memberAc.statements,
	member: [],
	invitation: [],
});

/** Competing participant. The default role for people joining an organization. */
export const member = ac.newRole({
	...memberAc.statements,
});
