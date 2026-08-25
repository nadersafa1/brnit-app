/**
 * brnit's organization model.
 *
 * App roles live on `user.role` (better-auth admin plugin); organization roles
 * live on `member.role`. The two are independent: an app `admin` has no member
 * row and therefore no org role, while an org `owner` may be a plain app `user`.
 *
 * TODO(@brnit/domain): `docs/migration/architecture.md` puts framework-free
 * roles in `packages/domain`. Move `ORGANIZATION_ROLES` / `APP_ROLES` there once
 * that package exists and re-export the types from here.
 */

/** `user.role` — better-auth admin plugin, `defaultRole: "user"`. */
export const APP_ROLES = ["admin", "nutritionist", "coach", "user"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** `member.role` — better-auth organization plugin. */
export const ORGANIZATION_ROLES = [
	"owner",
	"client_admin",
	"direct_admin",
	"nutritionist",
	"coach",
	"member",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface OrganizationSummary {
	createdAt: Date;
	id: string;
	logo?: string | null;
	name: string;
	slug: string;
}

/**
 * Resolved org scope for the current request. Serialized verbatim by
 * `GET /api/v1/users/me/organization-context`, so the field set is a client
 * contract — the web sidebar and the native org picker both read these flags.
 */
export interface OrganizationContext {
	activeOrgId: string | null;
	isAppAdmin: boolean;
	isAuthenticated: boolean;
	isClientAdmin: boolean;
	isCoach: boolean;
	isDirectAdmin: boolean;
	isMember: boolean;
	isNutritionist: boolean;
	isOwner: boolean;
	organization: OrganizationSummary | null;
	role: OrganizationRole | null;
	userId: string | null;
}
