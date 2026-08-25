import type { OrganizationRole } from "@brnit/domain";

/**
 * The organization scope resolved for a request.
 *
 * This is a **wire contract**, not an internal shape: it is serialized verbatim
 * by `GET /api/v1/users/me/organization-context`, and both the web sidebar and
 * the native organization picker branch on these flags. Adding a field is safe;
 * renaming or removing one is a breaking client change.
 *
 * The role flags are mutually exclusive within `role`, but `isAppAdmin` is
 * independent of all of them — an app admin has no `member` row and therefore
 * no organization role, while an organization `owner` may be a plain app `user`.
 */
export interface OrganizationSummary {
	createdAt: Date;
	id: string;
	logo?: string | null;
	name: string;
	slug: string;
}

export interface OrganizationContextDto {
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

/**
 * The context returned for an unauthenticated request.
 *
 * `GET /users/me/organization-context` deliberately answers 200 with this shape
 * rather than 401 — the clients call it before they know whether a session
 * exists, and a 401 would surface as an error toast on first paint.
 */
export const ANONYMOUS_ORGANIZATION_CONTEXT: OrganizationContextDto = {
	activeOrgId: null,
	isAppAdmin: false,
	isAuthenticated: false,
	isClientAdmin: false,
	isCoach: false,
	isDirectAdmin: false,
	isMember: false,
	isNutritionist: false,
	isOwner: false,
	organization: null,
	role: null,
	userId: null,
};

/** Derives the per-role booleans from a resolved organization role. */
export function organizationRoleFlags(role: OrganizationRole | null): {
	isClientAdmin: boolean;
	isCoach: boolean;
	isDirectAdmin: boolean;
	isMember: boolean;
	isNutritionist: boolean;
	isOwner: boolean;
} {
	return {
		isClientAdmin: role === "client_admin",
		isCoach: role === "coach",
		isDirectAdmin: role === "direct_admin",
		isMember: role === "member",
		isNutritionist: role === "nutritionist",
		isOwner: role === "owner",
	};
}
