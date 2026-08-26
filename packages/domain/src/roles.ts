/**
 * The two independent role axes in brnit.
 *
 * App roles live on `user.role` (better-auth admin plugin, `defaultRole: "user"`).
 * Organization roles live on `member.role` (better-auth organization plugin).
 * They are orthogonal: an app `admin` usually has no member row and therefore no
 * org role, while an org `owner` is often a plain app `user`.
 *
 * Neither axis is a rank. `nutritionist` and `coach` are peers, and
 * `client_admin` / `direct_admin` hold *different* capabilities rather than more
 * or less of the same one (a `client_admin` may invite members but may not
 * change roles; a `direct_admin` may change roles). Modelling either as a number
 * would encode a hierarchy that does not exist, so capability questions are
 * answered by the explicit predicates below.
 */

/** `user.role`. Both columns are plain `text` — there is no DB constraint. */
export const APP_ROLES = ["admin", "nutritionist", "coach", "user"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** better-auth's `defaultRole` for new sign-ups. */
export const DEFAULT_APP_ROLE = "user" as const satisfies AppRole;

/** The app role that bypasses every organization-scoped check. */
export const APP_ADMIN_ROLE = "admin" as const satisfies AppRole;

/** `member.role`. */
export const ORGANIZATION_ROLES = [
	"owner",
	"client_admin",
	"direct_admin",
	"nutritionist",
	"coach",
	"member",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

/** The competing-participant role. Only this role can be assigned a diet plan. */
export const ORGANIZATION_MEMBER_ROLE =
	"member" as const satisfies OrganizationRole;

/**
 * Roles an invitation may carry. `owner` is absent by design — the creator of an
 * organization becomes owner at creation time and is never invited.
 */
export const INVITABLE_ORGANIZATION_ROLES = [
	"client_admin",
	"direct_admin",
	"nutritionist",
	"coach",
	"member",
] as const;

export type InvitableOrganizationRole =
	(typeof INVITABLE_ORGANIZATION_ROLES)[number];

/**
 * Org roles that may invite with *any* role, and that may change another
 * member's role. Authoritative: this is what better-auth's
 * `beforeCreateInvitation` hook enforces server-side.
 */
/**
 * Organization roles that may send an invitation **at all**, whatever role it
 * carries.
 *
 * Wider than {@link ORG_ROLES_CAN_INVITE} on purpose, and the two answer
 * different questions asked at different layers:
 *
 * - This set mirrors which roles hold Better Auth's `invitation` access-control
 *   statements. `client_admin` does (it inherits the org-admin statement set),
 *   so the server accepts an invitation from one.
 * - {@link ORG_ROLES_CAN_INVITE} is what `beforeCreateInvitation` enforces on
 *   top: an invitation carrying any role **above** plain `member` additionally
 *   requires `owner` or `direct_admin`.
 *
 * So a `client_admin` may invite participants but not staff. A UI that gates
 * the whole invite affordance on the narrower set hides a capability the
 * server would have honoured; one that gates the role selector on the wider
 * set offers choices the server will reject. Gate the dialog on this, and the
 * role selector on {@link ORG_ROLES_CAN_INVITE}.
 */
export const ORG_ROLES_CAN_INVITE_MEMBERS = [
	"owner",
	"direct_admin",
	"client_admin",
] as const;

export type OrgRoleCanInviteMembers =
	(typeof ORG_ROLES_CAN_INVITE_MEMBERS)[number];

export const ORG_ROLES_CAN_INVITE = ["owner", "direct_admin"] as const;

export type OrgRoleCanInvite = (typeof ORG_ROLES_CAN_INVITE)[number];

export const ORG_ROLES_CAN_UPDATE_MEMBER_ROLE = [
	"owner",
	"direct_admin",
] as const;

export type OrgRoleCanUpdateMemberRole =
	(typeof ORG_ROLES_CAN_UPDATE_MEMBER_ROLE)[number];

/**
 * Narrows an unvalidated `user.role` from the database. The column is plain
 * `text`, so anything could be in there; callers should fall back to `null`
 * rather than echoing an unknown value into an API response.
 */
export function isAppRole(value: unknown): value is AppRole {
	return (
		typeof value === "string" &&
		(APP_ROLES as readonly string[]).includes(value)
	);
}

/** Narrows an unvalidated `member.role`. Same reasoning as {@link isAppRole}. */
export function isOrganizationRole(value: unknown): value is OrganizationRole {
	return (
		typeof value === "string" &&
		(ORGANIZATION_ROLES as readonly string[]).includes(value)
	);
}

export function isInvitableOrganizationRole(
	value: unknown
): value is InvitableOrganizationRole {
	return (
		typeof value === "string" &&
		(INVITABLE_ORGANIZATION_ROLES as readonly string[]).includes(value)
	);
}

/** App admins bypass org-role checks entirely. */
export function isAppAdmin(role: string | null | undefined): boolean {
	return role === APP_ADMIN_ROLE;
}

export interface RoleActor {
	appRole?: string | null;
	orgRole?: string | null;
}

/**
 * May the actor invite with a role other than `member`?
 * App admins always may; everyone else needs {@link ORG_ROLES_CAN_INVITE}.
 */
export function canInviteWithAnyRole(actor: RoleActor): boolean {
	if (isAppAdmin(actor.appRole)) {
		return true;
	}
	return (
		typeof actor.orgRole === "string" &&
		(ORG_ROLES_CAN_INVITE as readonly string[]).includes(actor.orgRole)
	);
}

/**
 * May the actor send *this* invitation?
 *
 * Inviting as plain `member` is governed by better-auth's access-control layer
 * in `@brnit/auth` (which grants `invitation: create` to owner and
 * client_admin), not here — this function only encodes the extra restriction
 * that any role above `member` requires {@link ORG_ROLES_CAN_INVITE}. Call it
 * after the AC check, never instead of it.
 *
 * Note for the client: the web helper `hasOrgInvitePermission` lets a
 * `client_admin` open the invite UI, which is fine as long as the role picker is
 * limited to `member` for them — the backend hook rejects anything else.
 */
/**
 * May this actor send an invitation at all?
 *
 * App admins always may; otherwise the actor's organization role must hold the
 * `invitation` statements — see {@link ORG_ROLES_CAN_INVITE_MEMBERS}. Use this
 * to decide whether to show the invite affordance; use
 * {@link canInviteWithAnyRole} to decide whether the role selector is offered.
 */
export function canInviteMembers(actor: RoleActor): boolean {
	if (isAppAdmin(actor.appRole)) {
		return true;
	}
	return (
		typeof actor.orgRole === "string" &&
		(ORG_ROLES_CAN_INVITE_MEMBERS as readonly string[]).includes(actor.orgRole)
	);
}

export function canInviteWithRole(
	actor: RoleActor & { role: string }
): boolean {
	if (actor.role === ORGANIZATION_MEMBER_ROLE) {
		return true;
	}
	return canInviteWithAnyRole(actor);
}

/**
 * May the actor change another member's role?
 * App admins and {@link ORG_ROLES_CAN_UPDATE_MEMBER_ROLE}. Client admins cannot.
 */
export function canUpdateMemberRole(actor: RoleActor): boolean {
	if (isAppAdmin(actor.appRole)) {
		return true;
	}
	return (
		typeof actor.orgRole === "string" &&
		(ORG_ROLES_CAN_UPDATE_MEMBER_ROLE as readonly string[]).includes(
			actor.orgRole
		)
	);
}
