import "./test-utils/route-test-env.js";

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import express, { type Express } from "express";

import { installRouteAuthMiddlewareMock } from "./route-test-auth-mock.js";
import {
	apiRouteMocks,
	resetApiRouteMocks,
} from "./test-utils/route-api-mock-state.js";
import type { RouteTestSession } from "./test-utils/route-auth-mocks.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * Route wiring for `/member/me/**`: guards, guard order, and the query
 * validation the controllers do before any handler runs.
 *
 * Handler behaviour is covered by the unit tests in `@brnit/api`; every case
 * here stops at the controller, so no request reaches the database.
 */

installRouteAuthMiddlewareMock();

const { createMemberRouter } = await import("./member.routes.js");

const BASE = "/api/v1/member/me";

function memberSession(
	activeOrganizationId: string | null = "org-1"
): RouteTestSession {
	return {
		session: { activeOrganizationId, id: "session-1" },
		user: { id: "user-1", role: "user" },
	};
}

async function withServer(
	assert: (baseUrl: string) => Promise<void>
): Promise<void> {
	const app: Express = express();
	app.use("/api/v1", createMemberRouter());
	const server = await startEphemeralServer(app);
	try {
		await assert(server.baseUrl);
	} finally {
		await server.close();
	}
}

beforeEach(() => {
	apiRouteMocks.session = memberSession();
	apiRouteMocks.memberId = "mem-1";
});

afterEach(() => {
	resetApiRouteMocks();
});

describe("member routes without a session", () => {
	const paths = [
		"/current-diet-plan",
		"/consumption-streak",
		"/organization-leaderboard",
		"/body-composition-assessments/recent",
		"/body-composition-assessments/assessment-1",
	];

	for (const path of paths) {
		it(`answers 401 for ${path}`, async () => {
			apiRouteMocks.session = null;
			await withServer(async (baseUrl) => {
				const response = await fetch(`${baseUrl}${BASE}${path}`);
				expect(response.status).toBe(401);
			});
		});
	}
});

describe("GET /member/me/current-diet-plan", () => {
	it("rejects a window that ends before it starts", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/current-diet-plan?from=2026-03-10&to=2026-03-01`
			);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Invalid query parameters");
		});
	});

	it("rejects a window longer than 31 days", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/current-diet-plan?from=2026-03-01&to=2026-04-05`
			);
			expect(response.status).toBe(400);
		});
	});

	it("rejects a date that is not a real calendar day", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/current-diet-plan?from=2026-02-31`
			);
			expect(response.status).toBe(400);
		});
	});
});

describe("GET /member/me/organization-leaderboard", () => {
	it("answers 400 NO_ORGANIZATION without an organization to scope to", async () => {
		apiRouteMocks.session = memberSession(null);
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${BASE}/organization-leaderboard`);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { code: string };
			expect(body.code).toBe("NO_ORGANIZATION");
		});
	});

	it("answers 403 NOT_MEMBER for an organization the caller is not in", async () => {
		apiRouteMocks.memberId = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/organization-leaderboard?orgId=org-other`
			);
			expect(response.status).toBe(403);
			const body = (await response.json()) as { code: string };
			expect(body.code).toBe("NOT_MEMBER");
		});
	});
});

describe("GET /member/me/body-composition-assessments/recent", () => {
	it("rejects a limit outside 1..20", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/body-composition-assessments/recent?limit=99`
			);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Invalid query parameters");
		});
	});

	it("answers 403 NOT_MEMBER when scoped to an organization the caller is not in", async () => {
		apiRouteMocks.memberId = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/body-composition-assessments/recent?orgId=org-other`
			);
			expect(response.status).toBe(403);
			const body = (await response.json()) as { code: string };
			expect(body.code).toBe("NOT_MEMBER");
		});
	});

	it("does not demand an organization when none is requested", async () => {
		// No `orgId` and no active organization: the reader spans every
		// membership, so the org guard must not run at all. A 400 here would
		// mean it did.
		apiRouteMocks.session = memberSession(null);
		apiRouteMocks.memberId = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/body-composition-assessments/recent?limit=0`
			);
			const body = (await response.json()) as { code?: string; error: string };
			expect(body.code).toBeUndefined();
			expect(body.error).toBe("Invalid query parameters");
		});
	});
});

describe("GET /member/me/body-composition-assessments/:id", () => {
	it("requires orgId even when an active organization is set", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/body-composition-assessments/assessment-1`
			);
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe("Invalid query parameters");
		});
	});

	it("answers 403 NOT_MEMBER for another organization", async () => {
		apiRouteMocks.memberId = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(
				`${baseUrl}${BASE}/body-composition-assessments/assessment-1?orgId=org-other`
			);
			expect(response.status).toBe(403);
			const body = (await response.json()) as { code: string };
			expect(body.code).toBe("NOT_MEMBER");
		});
	});
});
