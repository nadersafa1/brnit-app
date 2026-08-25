import { queryParam } from "@brnit/api";
import { auth } from "@brnit/auth";
import { db } from "@brnit/db";
import { member, organization } from "@brnit/db/schema";
import { fromNodeHeaders } from "better-auth/node";
import { and, eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";

import type { OrganizationContext } from "../types/organization-context.js";
import type { RequestAuth } from "../types/request-auth.js";
import { resolveOrganizationContext } from "./organization-context.js";

/** Stable API error code returned when a signed-in user is banned. */
export const USER_BANNED_ERROR_CODE = "USER_BANNED" as const;

/** `requireMemberOrg` could not resolve any organization to scope to. */
export const NO_ORGANIZATION_ERROR_CODE = "NO_ORGANIZATION" as const;

/** `requireMemberOrg` resolved an organization the caller does not belong to. */
export const NOT_MEMBER_ERROR_CODE = "NOT_MEMBER" as const;

/** App role granting unconditional access (better-auth admin plugin). */
const APP_ADMIN_ROLE = "admin";

/**
 * App role granting nutritionist access **without** an organization.
 * Distinct from the *org* role of the same name, which does require one.
 */
const APP_NUTRITIONIST_ROLE = "nutritionist";

const UNAUTHORIZED_MESSAGE = "Unauthorized";
const NUTRITIONIST_FORBIDDEN_MESSAGE =
	"Forbidden: nutritionist role and active organization required";
const ACTIVE_ORG_REQUIRED_MESSAGE =
	"Forbidden: active organization required for this operation";
const ASSESSMENT_WRITE_FORBIDDEN_MESSAGE =
	"Forbidden: direct admin, owner, or app admin role required";

type Middleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<void> | void;

function jsonError(
	res: Response,
	status: number,
	error: string,
	options?: { code?: string; message?: string }
): void {
	res.status(status).json({
		error,
		...(options?.code ? { code: options.code } : {}),
		...(options?.message ? { message: options.message } : {}),
	});
}

/**
 * Minimal ban shape. `banExpires` is accepted as a string too, because a
 * session deserialized from cache carries ISO dates rather than `Date`s.
 */
export interface UserBanInput {
	banExpires?: Date | string | null;
	banned?: boolean | null;
}

/**
 * True when the user is actively banned. Honors `banExpires` so an expired
 * temporary ban does not keep blocking API access if `banned` was never
 * cleared.
 */
export function isUserBanned(user: UserBanInput): boolean {
	if (user.banned !== true) {
		return false;
	}
	if (user.banExpires === null || user.banExpires === undefined) {
		return true;
	}
	const expiresAt =
		user.banExpires instanceof Date
			? user.banExpires
			: new Date(user.banExpires);
	if (Number.isNaN(expiresAt.getTime())) {
		return true;
	}
	return expiresAt.getTime() > Date.now();
}

/**
 * Just enough of the session user for the role predicates below.
 *
 * Structural rather than `Pick<SessionUser, "role">` so the predicates stay
 * unit-testable with hand-rolled fakes and do not break if better-auth's
 * plugin inference changes shape.
 */
export interface RoleBearingUser {
	id?: string;
	role?: string | null;
}

/** App admins bypass every org check; they have no `member` row to inspect. */
export function isAppAdmin(user: RoleBearingUser | undefined): boolean {
	return user?.role === APP_ADMIN_ROLE;
}

/**
 * Global (app-level) nutritionist. Unlike the org role of the same name this
 * needs no active organization — see `requireNutritionist`.
 */
export function isGlobalNutritionist(
	user: RoleBearingUser | undefined
): boolean {
	return user?.role === APP_NUTRITIONIST_ROLE;
}

/**
 * `requireNutritionist` predicate: app admin, **or** global nutritionist,
 * **or** org role `nutritionist` with an active organization.
 */
export function hasNutritionistAccess(
	user: RoleBearingUser | undefined,
	context: OrganizationContext
): boolean {
	if (context.isAppAdmin || isAppAdmin(user)) {
		return true;
	}
	if (isGlobalNutritionist(user)) {
		return true;
	}
	return Boolean(context.activeOrgId) && context.isNutritionist;
}

/**
 * `requireNutritionistOrgContext` predicate: nutritionist access plus a usable
 * organization.
 *
 * App admins keep the pre-overhaul bypass — they pass even with no
 * `activeOrgId` — while a global nutritionist without one is rejected.
 */
export function hasNutritionistOrgContext(
	user: RoleBearingUser | undefined,
	context: OrganizationContext
): boolean {
	if (!hasNutritionistAccess(user, context)) {
		return false;
	}
	if (context.isAppAdmin || isAppAdmin(user)) {
		return true;
	}
	return Boolean(context.activeOrgId);
}

/**
 * `requireAssessmentWriteAuth` role half:
 * app admin, org owner, or org direct admin.
 */
export function hasAssessmentWriteRole(context: OrganizationContext): boolean {
	return context.isAppAdmin || context.isOwner || context.isDirectAdmin;
}

function attachOrganization(req: Request, context: OrganizationContext): void {
	const current = req.auth;
	if (!current) {
		return;
	}
	req.auth = {
		...current,
		organization: context,
		...(context.activeOrgId ? { organizationId: context.activeOrgId } : {}),
	} satisfies RequestAuth;
}

/**
 * Requires a valid Better Auth session and sets `req.auth`.
 *
 * Every other guard in this file assumes it ran first — they read `req.auth`
 * rather than re-fetching the session, so route tuples always start with it.
 */
export function requireSession(): Middleware {
	return async (req, res, next) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});
		if (!session?.user) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}
		if (isUserBanned(session.user)) {
			jsonError(res, 401, "Account suspended", {
				code: USER_BANNED_ERROR_CODE,
			});
			return;
		}
		req.auth = { session: session.session, user: session.user };
		next();
	};
}

/**
 * Requires app role `admin`.
 *
 * NOTE: an authenticated non-admin gets **401**, not 403. That is the
 * pre-overhaul contract (`requireAdmin` collapsed both cases into
 * `Unauthorized`) and the clients branch on it; changing it to 403 is a
 * deliberate client-visible change, not a cleanup.
 */
export function requireAdmin(): Middleware {
	return (req, res, next) => {
		if (!isAppAdmin(req.auth?.user)) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}
		next();
	};
}

/**
 * Requires nutritionist access: app admin, global `nutritionist` app role, or
 * org role `nutritionist` with an active organization.
 *
 * Attaches the resolved context to `req.auth.organization`.
 */
export function requireNutritionist(): Middleware {
	return async (req, res, next) => {
		const authData = req.auth;
		if (!authData?.user) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}
		const context = await resolveOrganizationContext(authData);
		if (!hasNutritionistAccess(authData.user, context)) {
			jsonError(res, 403, NUTRITIONIST_FORBIDDEN_MESSAGE);
			return;
		}
		attachOrganization(req, context);
		next();
	};
}

/**
 * `requireNutritionist` plus an organization to work in: a global nutritionist
 * with no `activeOrgId` is rejected. App admins keep their bypass.
 */
export function requireNutritionistOrgContext(): Middleware {
	return async (req, res, next) => {
		const authData = req.auth;
		if (!authData?.user) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}
		const context = await resolveOrganizationContext(authData);
		if (!hasNutritionistAccess(authData.user, context)) {
			jsonError(res, 403, NUTRITIONIST_FORBIDDEN_MESSAGE);
			return;
		}
		if (!hasNutritionistOrgContext(authData.user, context)) {
			jsonError(res, 403, ACTIVE_ORG_REQUIRED_MESSAGE);
			return;
		}
		attachOrganization(req, context);
		next();
	};
}

/**
 * Body-composition assessment writes: (`isAppAdmin || isOwner ||
 * isDirectAdmin`) **and** an `activeOrgId`, because every write is scoped to
 * the caller's active organization.
 */
export function requireAssessmentWriteAuth(): Middleware {
	return async (req, res, next) => {
		const authData = req.auth;
		if (!authData?.user) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}
		const context = await resolveOrganizationContext(authData);
		if (!hasAssessmentWriteRole(context)) {
			jsonError(res, 403, ASSESSMENT_WRITE_FORBIDDEN_MESSAGE);
			return;
		}
		if (!context.activeOrgId) {
			jsonError(res, 403, ACTIVE_ORG_REQUIRED_MESSAGE);
			return;
		}
		attachOrganization(req, context);
		next();
	};
}

/**
 * Member-scoped endpoints: resolves `?orgId=` (falling back to the session's
 * active organization), proves membership, and attaches `memberId` /
 * `organizationId` to `req.auth`.
 *
 * Both the membership row and the organization row must exist — a member row
 * pointing at a deleted org is treated as no membership at all.
 */
export function requireMemberOrg(): Middleware {
	return async (req, res, next) => {
		const authData = req.auth;
		if (!authData?.user) {
			jsonError(res, 401, UNAUTHORIZED_MESSAGE);
			return;
		}

		const requestedOrgId = queryParam(req.query.orgId)?.trim();
		const effectiveOrgId =
			requestedOrgId || authData.session?.activeOrganizationId || null;

		if (!effectiveOrgId) {
			jsonError(res, 400, "Organization context required", {
				code: NO_ORGANIZATION_ERROR_CODE,
				message: "Provide orgId query parameter or set an active organization.",
			});
			return;
		}

		const [membershipRows, orgRows] = await Promise.all([
			db
				.select({ id: member.id, organizationId: member.organizationId })
				.from(member)
				.where(
					and(
						eq(member.userId, authData.user.id),
						eq(member.organizationId, effectiveOrgId)
					)
				)
				.limit(1),
			db
				.select({ id: organization.id })
				.from(organization)
				.where(eq(organization.id, effectiveOrgId))
				.limit(1),
		]);

		const membership = membershipRows[0];
		if (!(membership && orgRows[0])) {
			jsonError(res, 403, "Forbidden", {
				code: NOT_MEMBER_ERROR_CODE,
				message: "You are not a member of this organization.",
			});
			return;
		}

		req.auth = {
			...authData,
			memberId: membership.id,
			organizationId: membership.organizationId,
		} satisfies RequestAuth;
		next();
	};
}
