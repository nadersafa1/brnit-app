/**
 * Authorization predicates used by the Better Auth organization hooks.
 *
 * The rules themselves live in `@brnit/domain` so the server middleware, the
 * API handlers and the clients all answer the same questions the same way.
 * This module only re-exports them under the path `@brnit/auth/authorization`
 * has always used — do not reimplement a rule here.
 *
 * Known client divergence, still outstanding: the web helper
 * `hasOrgInvitePermission` lets a `client_admin` open the invite UI. That is
 * only safe while the role picker is limited to `member` for them, because
 * `beforeCreateInvitation` rejects anything above `member` from a
 * `client_admin`. The backend is authoritative; the web gate needs correcting
 * in `apps/web` (not owned by this package).
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
