import type { OrganizationContextDto } from "@brnit/api";
import {
	canInviteMembers,
	canInviteWithAnyRole,
	canUpdateMemberRole,
	isAppAdmin,
} from "@brnit/domain";

/**
 * Which dashboard sections a signed-in user may reach.
 *
 * These mirror the server guards in `apps/server/src/middlewares/auth-middleware.ts`
 * one-for-one (`requireAdmin`, `requireNutritionist`,
 * `requireAssessmentWriteAuth`). They are a **navigation** concern only — the
 * API re-checks every request, so a stale flag here can hide a section but can
 * never grant access to data.
 *
 * The rules themselves come from `@brnit/domain`; nothing role-shaped is
 * reimplemented in this app.
 */

/** The slice of the organization context these predicates read. */
export type DashboardAccessContext = Pick<
	OrganizationContextDto,
	| "activeOrgId"
	| "isAppAdmin"
	| "isDirectAdmin"
	| "isNutritionist"
	| "isOwner"
	| "role"
>;

/** Mirrors `requireAdmin`: the app role, independent of any organization. */
export function canAccessAdminSection(
	appRole: string | null | undefined
): boolean {
	return isAppAdmin(appRole);
}

/**
 * Mirrors `requireNutritionist`: an app admin, **or** a global app-role
 * nutritionist (who needs no organization), **or** an org-role nutritionist
 * with an active organization.
 */
export function canAccessNutritionistSection(
	appRole: string | null | undefined,
	context: DashboardAccessContext
): boolean {
	if (context.isAppAdmin || isAppAdmin(appRole)) {
		return true;
	}
	if (appRole === "nutritionist") {
		return true;
	}
	return context.isNutritionist && context.activeOrgId !== null;
}

/**
 * Mirrors `requireAssessmentWriteAuth`: app admin, org owner or direct admin —
 * and, for everyone but the app admin, an active organization to scope writes to.
 */
export function canAccessDirectAdminSection(
	appRole: string | null | undefined,
	context: DashboardAccessContext
): boolean {
	if (context.isAppAdmin || isAppAdmin(appRole)) {
		return true;
	}
	return (
		(context.isOwner || context.isDirectAdmin) && context.activeOrgId !== null
	);
}

/**
 * May the actor open the invite dialog at all?
 *
 * Wider than {@link canInviteOrganizationMembersWithAnyRole} on purpose,
 * because the server asks two questions at two layers: Better Auth's
 * access-control statements decide whether an invitation may be sent, and
 * `beforeCreateInvitation` decides whether it may carry a role above plain
 * `member`. `client_admin` passes the first and fails the second, so it may
 * invite participants but not staff.
 *
 * Gating the whole affordance on the narrower rule would hide a capability the
 * server honours — which is what the pre-overhaul UI did in reverse, letting a
 * `client_admin` choose staff roles the hook then rejected.
 */
export function canInviteOrganizationMembers(
	appRole: string | null | undefined,
	context: DashboardAccessContext
): boolean {
	return canInviteMembers({ appRole, orgRole: context.role });
}

/**
 * May the actor choose a role other than `member` for an invitation?
 *
 * Drives the role selector. When this is false the invite dialog still opens,
 * but the invitation is fixed to `member` — matching what
 * `beforeCreateInvitation` will accept.
 */
export function canInviteOrganizationMembersWithAnyRole(
	appRole: string | null | undefined,
	context: DashboardAccessContext
): boolean {
	return canInviteWithAnyRole({ appRole, orgRole: context.role });
}

/** May the actor change another member's role or remove them? */
export function canManageOrganizationMembers(
	appRole: string | null | undefined,
	context: DashboardAccessContext
): boolean {
	return canUpdateMemberRole({ appRole, orgRole: context.role });
}
