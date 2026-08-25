/**
 * Role vocabulary for the Better Auth layer.
 *
 * The pure role data and every capability rule live in `@brnit/domain`, so
 * `@brnit/db`, `@brnit/api` and the clients can use them without depending on
 * `@brnit/auth`. This module re-exports that surface under the path the auth
 * package has always owned, and adds the pieces that only make sense next to a
 * Better Auth config.
 *
 * Despite the filename — kept to match `qpadel/packages/auth/src/role-ranks.ts`
 * — brnit has **no role ranks**. Neither axis is a ladder: `coach` and
 * `nutritionist` are peers, and `client_admin` / `direct_admin` hold different
 * capabilities rather than more or less of the same one. See the header of
 * `packages/domain/src/roles.ts`; capability questions are answered by the
 * explicit predicates below, never by comparing numbers.
 */
/** biome-ignore lint/performance/noBarrelFile: `@brnit/auth/role-ranks` compatibility re-export of the domain role vocabulary */
export {
	APP_ADMIN_ROLE,
	APP_ROLES,
	type AppRole,
	canInviteWithAnyRole,
	canInviteWithRole,
	canUpdateMemberRole,
	DEFAULT_APP_ROLE,
	INVITABLE_ORGANIZATION_ROLES,
	type InvitableOrganizationRole,
	isAppAdmin,
	isAppRole,
	isInvitableOrganizationRole,
	isOrganizationRole,
	ORG_ROLES_CAN_INVITE,
	ORG_ROLES_CAN_UPDATE_MEMBER_ROLE,
	ORGANIZATION_MEMBER_ROLE,
	ORGANIZATION_ROLES,
	type OrganizationRole,
	type OrgRoleCanInvite,
	type OrgRoleCanUpdateMemberRole,
	type RoleActor,
} from "@brnit/domain";

/**
 * Better Auth's `creatorRole`: the role stamped on the `member` row of whoever
 * creates an organization. Absent from `INVITABLE_ORGANIZATION_ROLES` on
 * purpose — an owner is never invited.
 */
export const ORG_CREATOR_ROLE = "owner" as const;

/** Better Auth's `membershipLimit` for an organization. */
export const ORG_MEMBERSHIP_LIMIT = 100;
