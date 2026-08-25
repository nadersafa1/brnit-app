/**
 * Authorization predicates used by the Better Auth organization hooks.
 *
 * The rules themselves live in `@brnit/domain` so the server middleware, the
 * API handlers and the clients all answer the same questions the same way.
 * This module only re-exports them under the path `@brnit/auth/authorization`
 * has always used — do not reimplement a rule here.
 */
/** biome-ignore lint/performance/noBarrelFile: `@brnit/auth/authorization` compatibility re-export */
export {
	APP_ADMIN_ROLE,
	canInviteWithAnyRole,
	canUpdateMemberRole,
	ORG_ROLES_CAN_INVITE,
	ORG_ROLES_CAN_UPDATE_MEMBER_ROLE,
	type OrgRoleCanInvite,
	type OrgRoleCanUpdateMemberRole,
	type RoleActor,
} from "@brnit/domain";
