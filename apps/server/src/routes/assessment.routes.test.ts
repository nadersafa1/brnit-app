import "./test-utils/route-test-env.js";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import express, { type Express } from "express";

import type { OrganizationContext } from "../types/organization-context.js";
import { installRouteAuthMiddlewareMock } from "./route-test-auth-mock.js";
import {
	apiRouteMocks,
	resetApiRouteMocks,
} from "./test-utils/route-api-mock-state.js";
import type { RouteTestSession } from "./test-utils/route-auth-mocks.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * Guard wiring for the assessment routes: who may write, who may only read,
 * and the query validation that runs before any handler.
 */

installRouteAuthMiddlewareMock();

const { createAssessmentRouter } = await import("./assessment.routes.js");

const DIRECT_ADMIN = "/api/v1/direct-admin/body-composition-assessments";
const NUTRITIONIST = "/api/v1/nutritionist/body-composition-assessments";

function staffSession(role: string | null = "user"): RouteTestSession {
	return {
		session: { activeOrganizationId: "org-1", id: "session-1" },
		user: { id: "user-1", role },
	};
}

function organizationContext(
	overrides: Partial<OrganizationContext> = {}
): OrganizationContext {
	return {
		activeOrgId: "org-1",
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
		userId: "user-1",
		...overrides,
	};
}

async function withServer(
	assert: (baseUrl: string) => Promise<void>
): Promise<void> {
	const app: Express = express();
	app.use("/api/v1", createAssessmentRouter());
	const server = await startEphemeralServer(app);
	try {
		await assert(server.baseUrl);
	} finally {
		await server.close();
	}
}

beforeEach(() => {
	apiRouteMocks.session = staffSession();
	apiRouteMocks.organizationContext = organizationContext({
		isDirectAdmin: true,
		role: "direct_admin",
	});
});

afterEach(() => {
	resetApiRouteMocks();
});

describe("assessment routes without a session", () => {
	const requests = [
		{ method: "GET", path: DIRECT_ADMIN },
		{ method: "POST", path: DIRECT_ADMIN },
		{ method: "GET", path: `${DIRECT_ADMIN}/assessment-1` },
		{ method: "PATCH", path: `${DIRECT_ADMIN}/assessment-1` },
		{ method: "DELETE", path: `${DIRECT_ADMIN}/assessment-1` },
		{ method: "GET", path: NUTRITIONIST },
	];

	for (const { method, path } of requests) {
		it(`answers 401 for ${method} ${path}`, async () => {
			apiRouteMocks.session = null;
			await withServer(async (baseUrl) => {
				const response = await fetch(`${baseUrl}${path}`, { method });
				expect(response.status).toBe(401);
			});
		});
	}
});

describe("GET /direct-admin/body-composition-assessments", () => {
	it("answers 403 for an organization role that cannot write", async () => {
		apiRouteMocks.organizationContext = organizationContext({
			isMember: true,
			role: "member",
		});
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${DIRECT_ADMIN}`);
			expect(response.status).toBe(403);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe(
				"Forbidden: direct admin, owner, or app admin role required"
			);
		});
	});

	it("answers 403 when the writer has no active organization", async () => {
		apiRouteMocks.organizationContext = organizationContext({
			activeOrgId: null,
			isOwner: true,
			role: "owner",
		});
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${DIRECT_ADMIN}`);
			expect(response.status).toBe(403);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe(
				"Forbidden: active organization required for this operation"
			);
		});
	});

	it("rejects an out-of-range page size before reaching the handler", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${DIRECT_ADMIN}?perPage=0`);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Invalid query parameters");
		});
	});
});

describe("GET /nutritionist/body-composition-assessments", () => {
	it("answers 403 without nutritionist access", async () => {
		apiRouteMocks.organizationContext = organizationContext({
			isMember: true,
			role: "member",
		});
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${NUTRITIONIST}`);
			expect(response.status).toBe(403);
		});
	});

	it("reaches the same list validation as the direct-admin route", async () => {
		apiRouteMocks.organizationContext = organizationContext({
			isNutritionist: true,
			role: "nutritionist",
		});
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${NUTRITIONIST}?perPage=0`);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Invalid query parameters");
		});
	});
});
