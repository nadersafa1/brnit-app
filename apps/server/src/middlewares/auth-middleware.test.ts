import "../routes/test-utils/route-test-env.js";

import { beforeEach, describe, expect, it, mock } from "bun:test";
import { member } from "@brnit/db/schema";
import type { NextFunction, Request, Response } from "express";

import type { OrganizationContext } from "../types/organization-context.js";

interface FakeSession {
	session: { activeOrganizationId: string | null; id: string };
	user: {
		banExpires?: Date | string | null;
		banned?: boolean | null;
		id: string;
		role: string | null;
	};
}

function buildContext(
	overrides: Partial<OrganizationContext> = {}
): OrganizationContext {
	return {
		activeOrgId: null,
		isAppAdmin: false,
		isAuthenticated: true,
		isClientAdmin: false,
		isCoach: false,
		isDirectAdmin: false,
		isMember: false,
		isNutritionist: false,
		isOwner: false,
		organization: null,
		role: null,
		userId: "user_1",
		...overrides,
	};
}

const state: {
	membershipRows: { id: string; organizationId: string }[];
	organizationContext: OrganizationContext;
	organizationRows: { id: string }[];
	session: FakeSession | null;
} = {
	membershipRows: [],
	organizationContext: buildContext(),
	organizationRows: [],
	session: null,
};

mock.module("@brnit/auth", () => ({
	auth: { api: { getSession: () => Promise.resolve(state.session) } },
}));

// `select().from(table).where().limit()` is the only shape the guards use;
// the table identity decides which rows come back.
mock.module("@brnit/db", () => ({
	db: {
		select: () => ({
			from: (table: unknown) => ({
				where: () => ({
					limit: () =>
						Promise.resolve(
							table === member ? state.membershipRows : state.organizationRows
						),
				}),
			}),
		}),
	},
}));

mock.module("./organization-context.js", () => ({
	resolveOrganizationContext: () => Promise.resolve(state.organizationContext),
}));

const {
	hasAssessmentWriteRole,
	hasNutritionistAccess,
	hasNutritionistOrgContext,
	isAppAdmin,
	isGlobalNutritionist,
	isUserBanned,
	NO_ORGANIZATION_ERROR_CODE,
	NOT_MEMBER_ERROR_CODE,
	requireAdmin,
	requireAssessmentWriteAuth,
	requireMemberOrg,
	requireNutritionist,
	requireNutritionistOrgContext,
	requireSession,
	USER_BANNED_ERROR_CODE,
} = await import("./auth-middleware.js");

type Middleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => Promise<void> | void;

interface MiddlewareOutcome {
	body: unknown;
	nextCalled: boolean;
	req: Request;
	status: number;
}

async function runMiddleware(
	middleware: Middleware,
	req: Request
): Promise<MiddlewareOutcome> {
	let status = 0;
	let body: unknown;
	const res = {
		status: (code: number) => {
			status = code;
			return {
				json: (payload: unknown) => {
					body = payload;
				},
			};
		},
	} as unknown as Response;

	let nextCalled = false;
	const next: NextFunction = () => {
		nextCalled = true;
	};

	await middleware(req, res, next);
	return { body, nextCalled, req, status };
}

function fakeRequest(overrides: Partial<Request> = {}): Request {
	return { headers: {}, query: {}, ...overrides } as unknown as Request;
}

function authedRequest(
	user: Partial<FakeSession["user"]> = {},
	activeOrganizationId: string | null = null
): Request {
	return fakeRequest({
		auth: {
			session: { activeOrganizationId, id: "sess_1" },
			user: { id: "user_1", role: null, ...user },
		},
	} as unknown as Partial<Request>);
}

beforeEach(() => {
	state.membershipRows = [];
	state.organizationRows = [];
	state.organizationContext = buildContext();
	state.session = null;
});

describe("isUserBanned", () => {
	it.each([
		[{ banned: false }, false],
		[{ banned: null }, false],
		[{}, false],
		[{ banned: true }, true],
		[{ banned: true, banExpires: null }, true],
		[{ banned: true, banExpires: "not-a-date" }, true],
		[{ banned: true, banExpires: new Date(Date.now() + 60_000) }, true],
		[{ banned: true, banExpires: new Date(Date.now() - 60_000) }, false],
	])("%o -> %s", (user, expected) => {
		expect(isUserBanned(user)).toBe(expected);
	});
});

describe("app role predicates", () => {
	it("recognizes the app admin role", () => {
		expect(isAppAdmin({ role: "admin" })).toBe(true);
		expect(isAppAdmin({ role: "nutritionist" })).toBe(false);
		expect(isAppAdmin(undefined)).toBe(false);
	});

	it("recognizes the global nutritionist app role", () => {
		expect(isGlobalNutritionist({ role: "nutritionist" })).toBe(true);
		expect(isGlobalNutritionist({ role: "user" })).toBe(false);
		expect(isGlobalNutritionist(undefined)).toBe(false);
	});
});

describe("hasNutritionistAccess", () => {
	it("allows app admins with no organization", () => {
		expect(hasNutritionistAccess({ role: "admin" }, buildContext())).toBe(true);
	});

	it("allows a global nutritionist with no organization", () => {
		expect(hasNutritionistAccess({ role: "nutritionist" }, buildContext())).toBe(
			true
		);
	});

	it("allows an org nutritionist with an active organization", () => {
		expect(
			hasNutritionistAccess(
				{ role: "user" },
				buildContext({ activeOrgId: "org_1", isNutritionist: true })
			)
		).toBe(true);
	});

	it("rejects an org nutritionist without an active organization", () => {
		expect(
			hasNutritionistAccess(
				{ role: "user" },
				buildContext({ isNutritionist: true })
			)
		).toBe(false);
	});

	it("rejects other org roles", () => {
		expect(
			hasNutritionistAccess(
				{ role: "user" },
				buildContext({ activeOrgId: "org_1", isCoach: true })
			)
		).toBe(false);
	});
});

describe("hasNutritionistOrgContext", () => {
	it("keeps the app-admin bypass even without an active organization", () => {
		expect(hasNutritionistOrgContext({ role: "admin" }, buildContext())).toBe(
			true
		);
	});

	it("rejects a global nutritionist without an active organization", () => {
		expect(
			hasNutritionistOrgContext({ role: "nutritionist" }, buildContext())
		).toBe(false);
	});

	it("allows a global nutritionist that has one", () => {
		expect(
			hasNutritionistOrgContext(
				{ role: "nutritionist" },
				buildContext({ activeOrgId: "org_1" })
			)
		).toBe(true);
	});
});

describe("hasAssessmentWriteRole", () => {
	it.each([
		[{ isAppAdmin: true }, true],
		[{ isOwner: true }, true],
		[{ isDirectAdmin: true }, true],
		[{ isClientAdmin: true }, false],
		[{ isNutritionist: true }, false],
		[{ isMember: true }, false],
	])("%o -> %s", (flags, expected) => {
		expect(hasAssessmentWriteRole(buildContext(flags))).toBe(expected);
	});
});

describe("requireSession", () => {
	it("returns 401 without a session", async () => {
		const outcome = await runMiddleware(requireSession(), fakeRequest());
		expect(outcome.status).toBe(401);
		expect(outcome.body).toEqual({ error: "Unauthorized" });
		expect(outcome.nextCalled).toBe(false);
	});

	it("returns 401 with USER_BANNED for a banned user", async () => {
		state.session = {
			session: { activeOrganizationId: null, id: "sess_1" },
			user: { banned: true, id: "user_1", role: "user" },
		};
		const outcome = await runMiddleware(requireSession(), fakeRequest());
		expect(outcome.status).toBe(401);
		expect(outcome.body).toEqual({
			error: "Account suspended",
			code: USER_BANNED_ERROR_CODE,
		});
	});

	it("attaches req.auth and continues", async () => {
		state.session = {
			session: { activeOrganizationId: "org_1", id: "sess_1" },
			user: { id: "user_1", role: "user" },
		};
		const outcome = await runMiddleware(requireSession(), fakeRequest());
		expect(outcome.nextCalled).toBe(true);
		expect(outcome.req.auth?.user.id).toBe("user_1");
		expect(outcome.req.auth?.session.activeOrganizationId).toBe("org_1");
	});
});

describe("requireAdmin", () => {
	it("returns 401 when no session was attached", async () => {
		const outcome = await runMiddleware(requireAdmin(), fakeRequest());
		expect(outcome.status).toBe(401);
	});

	// Pre-overhaul contract: an authenticated non-admin also gets 401, not 403.
	it("returns 401 for an authenticated non-admin", async () => {
		const outcome = await runMiddleware(
			requireAdmin(),
			authedRequest({ role: "nutritionist" })
		);
		expect(outcome.status).toBe(401);
		expect(outcome.nextCalled).toBe(false);
	});

	it("continues for an app admin", async () => {
		const outcome = await runMiddleware(
			requireAdmin(),
			authedRequest({ role: "admin" })
		);
		expect(outcome.nextCalled).toBe(true);
	});
});

describe("requireNutritionist", () => {
	it("returns 401 without a session", async () => {
		const outcome = await runMiddleware(requireNutritionist(), fakeRequest());
		expect(outcome.status).toBe(401);
	});

	it("returns 403 for a user with no nutritionist access", async () => {
		state.organizationContext = buildContext({
			activeOrgId: "org_1",
			isMember: true,
		});
		const outcome = await runMiddleware(
			requireNutritionist(),
			authedRequest({ role: "user" }, "org_1")
		);
		expect(outcome.status).toBe(403);
		expect(outcome.body).toEqual({
			error: "Forbidden: nutritionist role and active organization required",
		});
	});

	it("attaches the resolved organization context on success", async () => {
		state.organizationContext = buildContext({
			activeOrgId: "org_1",
			isNutritionist: true,
			role: "nutritionist",
		});
		const outcome = await runMiddleware(
			requireNutritionist(),
			authedRequest({ role: "user" }, "org_1")
		);
		expect(outcome.nextCalled).toBe(true);
		expect(outcome.req.auth?.organization?.role).toBe("nutritionist");
		expect(outcome.req.auth?.organizationId).toBe("org_1");
	});
});

describe("requireNutritionistOrgContext", () => {
	it("rejects a global nutritionist with no active organization", async () => {
		const outcome = await runMiddleware(
			requireNutritionistOrgContext(),
			authedRequest({ role: "nutritionist" })
		);
		expect(outcome.status).toBe(403);
		expect(outcome.body).toEqual({
			error: "Forbidden: active organization required for this operation",
		});
	});

	it("lets an app admin through without an active organization", async () => {
		state.organizationContext = buildContext({ isAppAdmin: true });
		const outcome = await runMiddleware(
			requireNutritionistOrgContext(),
			authedRequest({ role: "admin" })
		);
		expect(outcome.nextCalled).toBe(true);
	});
});

describe("requireAssessmentWriteAuth", () => {
	it("returns 403 for a role that cannot write assessments", async () => {
		state.organizationContext = buildContext({
			activeOrgId: "org_1",
			isNutritionist: true,
		});
		const outcome = await runMiddleware(
			requireAssessmentWriteAuth(),
			authedRequest({ role: "user" }, "org_1")
		);
		expect(outcome.status).toBe(403);
		expect(outcome.body).toEqual({
			error: "Forbidden: direct admin, owner, or app admin role required",
		});
	});

	it("returns 403 when the role is right but no organization is active", async () => {
		state.organizationContext = buildContext({ isDirectAdmin: true });
		const outcome = await runMiddleware(
			requireAssessmentWriteAuth(),
			authedRequest({ role: "user" })
		);
		expect(outcome.status).toBe(403);
		expect(outcome.body).toEqual({
			error: "Forbidden: active organization required for this operation",
		});
	});

	it("continues for a direct admin with an active organization", async () => {
		state.organizationContext = buildContext({
			activeOrgId: "org_1",
			isDirectAdmin: true,
		});
		const outcome = await runMiddleware(
			requireAssessmentWriteAuth(),
			authedRequest({ role: "user" }, "org_1")
		);
		expect(outcome.nextCalled).toBe(true);
		expect(outcome.req.auth?.organizationId).toBe("org_1");
	});
});

describe("requireMemberOrg", () => {
	it("returns 400 NO_ORGANIZATION when neither orgId nor active org is set", async () => {
		const outcome = await runMiddleware(
			requireMemberOrg(),
			authedRequest({ role: "user" })
		);
		expect(outcome.status).toBe(400);
		expect(outcome.body).toEqual({
			error: "Organization context required",
			code: NO_ORGANIZATION_ERROR_CODE,
			message: "Provide orgId query parameter or set an active organization.",
		});
	});

	it("returns 403 NOT_MEMBER when the membership is missing", async () => {
		state.organizationRows = [{ id: "org_1" }];
		const req = authedRequest({ role: "user" }, "org_1");
		const outcome = await runMiddleware(requireMemberOrg(), req);
		expect(outcome.status).toBe(403);
		expect(outcome.body).toEqual({
			error: "Forbidden",
			code: NOT_MEMBER_ERROR_CODE,
			message: "You are not a member of this organization.",
		});
	});

	it("returns 403 NOT_MEMBER when the organization row is missing", async () => {
		state.membershipRows = [{ id: "member_1", organizationId: "org_1" }];
		const outcome = await runMiddleware(
			requireMemberOrg(),
			authedRequest({ role: "user" }, "org_1")
		);
		expect(outcome.status).toBe(403);
	});

	it("attaches memberId and prefers ?orgId= over the session org", async () => {
		state.membershipRows = [{ id: "member_1", organizationId: "org_2" }];
		state.organizationRows = [{ id: "org_2" }];
		const req = authedRequest({ role: "user" }, "org_1");
		req.query = { orgId: "org_2" };

		const outcome = await runMiddleware(requireMemberOrg(), req);
		expect(outcome.nextCalled).toBe(true);
		expect(outcome.req.auth?.memberId).toBe("member_1");
		expect(outcome.req.auth?.organizationId).toBe("org_2");
	});
});
