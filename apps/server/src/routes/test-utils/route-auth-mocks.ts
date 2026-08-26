import type { OrganizationContext } from "../../types/organization-context.js";

export type RouteTestSession = {
	session: { activeOrganizationId: string | null; id: string };
	user: { id: string; role: string | null };
} | null;

interface JsonRes {
	status: (code: number) => { json: (body: unknown) => void };
}

interface AuthAwareReq {
	auth?: {
		memberId?: string;
		organization?: OrganizationContext;
		organizationId?: string;
		session: NonNullable<RouteTestSession>["session"];
		user: NonNullable<RouteTestSession>["user"];
	};
	query?: Record<string, unknown>;
}

type MockMiddleware = (
	req: AuthAwareReq,
	res: JsonRes,
	next: () => void
) => void;

const APP_ADMIN_ROLE = "admin";
const APP_NUTRITIONIST_ROLE = "nutritionist";

interface RouteAuthAccessors {
	getMemberId: () => string | null;
	getOrganizationContext: () => OrganizationContext | null;
	getSession: () => RouteTestSession;
}

/**
 * Express auth-middleware mocks for route tests. Mirrors the production
 * decisions in `middlewares/auth-middleware.ts` without touching Better Auth
 * or the database, and returns the same status codes and bodies.
 *
 * Install with `installRouteAuthMiddlewareMock()` — the specifier has to match
 * the one route modules use.
 */
export function createRouteAuthMiddlewareMocks(accessors: RouteAuthAccessors) {
	const unauthorized = (res: JsonRes): void => {
		res.status(401).json({ error: "Unauthorized" });
	};

	const hasNutritionistAccess = (): boolean => {
		const session = accessors.getSession();
		const context = accessors.getOrganizationContext();
		if (session?.user.role === APP_ADMIN_ROLE || context?.isAppAdmin) {
			return true;
		}
		if (session?.user.role === APP_NUTRITIONIST_ROLE) {
			return true;
		}
		return Boolean(context?.activeOrgId && context.isNutritionist);
	};

	return {
		requireSession: (): MockMiddleware => (req, res, next) => {
			const session = accessors.getSession();
			if (!session) {
				unauthorized(res);
				return;
			}
			req.auth = { session: session.session, user: session.user };
			next();
		},

		requireAdmin: (): MockMiddleware => (req, res, next) => {
			if (req.auth?.user.role !== APP_ADMIN_ROLE) {
				unauthorized(res);
				return;
			}
			next();
		},

		requireNutritionist: (): MockMiddleware => (req, res, next) => {
			if (!req.auth) {
				unauthorized(res);
				return;
			}
			if (!hasNutritionistAccess()) {
				res.status(403).json({
					error:
						"Forbidden: nutritionist role and active organization required",
				});
				return;
			}
			const context = accessors.getOrganizationContext();
			if (context) {
				req.auth.organization = context;
			}
			next();
		},

		requireNutritionistOrgContext: (): MockMiddleware => (req, res, next) => {
			if (!req.auth) {
				unauthorized(res);
				return;
			}
			if (!hasNutritionistAccess()) {
				res.status(403).json({
					error:
						"Forbidden: nutritionist role and active organization required",
				});
				return;
			}
			const context = accessors.getOrganizationContext();
			const isAdmin =
				req.auth.user.role === APP_ADMIN_ROLE || context?.isAppAdmin === true;
			if (!(isAdmin || context?.activeOrgId)) {
				res.status(403).json({
					error: "Forbidden: active organization required for this operation",
				});
				return;
			}
			if (context) {
				req.auth.organization = context;
				req.auth.organizationId = context.activeOrgId ?? undefined;
			}
			next();
		},

		requireAssessmentWriteAuth: (): MockMiddleware => (req, res, next) => {
			if (!req.auth) {
				unauthorized(res);
				return;
			}
			const context = accessors.getOrganizationContext();
			const allowed = Boolean(
				context?.isAppAdmin || context?.isOwner || context?.isDirectAdmin
			);
			if (!allowed) {
				res.status(403).json({
					error: "Forbidden: direct admin, owner, or app admin role required",
				});
				return;
			}
			if (!context?.activeOrgId) {
				res.status(403).json({
					error: "Forbidden: active organization required for this operation",
				});
				return;
			}
			req.auth.organization = context;
			req.auth.organizationId = context.activeOrgId;
			next();
		},

		requireMemberOrg: (): MockMiddleware => (req, res, next) => {
			if (!req.auth) {
				unauthorized(res);
				return;
			}
			const requestedOrgId =
				typeof req.query?.orgId === "string" ? req.query.orgId : undefined;
			const organizationId =
				requestedOrgId || req.auth.session.activeOrganizationId || null;
			if (!organizationId) {
				res.status(400).json({
					error: "Organization context required",
					code: "NO_ORGANIZATION",
					message:
						"Provide orgId query parameter or set an active organization.",
				});
				return;
			}
			const memberId = accessors.getMemberId();
			if (!memberId) {
				res.status(403).json({
					error: "Forbidden",
					code: "NOT_MEMBER",
					message: "You are not a member of this organization.",
				});
				return;
			}
			req.auth.memberId = memberId;
			req.auth.organizationId = organizationId;
			next();
		},
	};
}
