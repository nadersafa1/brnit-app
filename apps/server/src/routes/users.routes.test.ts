import "./test-utils/route-test-env.js";

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import express, { type Express } from "express";

import type { OrganizationContext } from "../types/organization-context.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * `GET /users/me/organization-context` is the one endpoint that must answer
 * 200 without a session, because both clients call it before they know
 * whether one exists.
 */

const ANONYMOUS: OrganizationContext = {
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

const state: {
	resolvedWith: unknown;
	session: {
		session: { activeOrganizationId: string | null; id: string };
		user: { id: string; role: string | null };
	} | null;
} = {
	resolvedWith: undefined,
	session: null,
};

mock.module("@brnit/auth", () => ({
	auth: { api: { getSession: () => Promise.resolve(state.session) } },
}));

mock.module("../middlewares/organization-context.js", () => ({
	resolveOrganizationContext: (auth: unknown) => {
		state.resolvedWith = auth;
		return Promise.resolve(
			auth === null
				? ANONYMOUS
				: { ...ANONYMOUS, isAuthenticated: true, userId: "user-1" }
		);
	},
}));

const { createUsersRouter } = await import("./users.routes.js");

const PATH = "/api/v1/users/me/organization-context";

async function withServer(
	assert: (baseUrl: string) => Promise<void>
): Promise<void> {
	const app: Express = express();
	app.use("/api/v1", createUsersRouter());
	const server = await startEphemeralServer(app);
	try {
		await assert(server.baseUrl);
	} finally {
		await server.close();
	}
}

beforeEach(() => {
	state.resolvedWith = undefined;
	state.session = null;
});

afterEach(() => {
	state.session = null;
});

describe("GET /users/me/organization-context", () => {
	it("answers 200 with the anonymous shape when there is no session", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`);
			expect(response.status).toBe(200);
			expect(await response.json()).toEqual(ANONYMOUS);
		});
		// A signed-out caller must never reach the membership resolver's
		// session branch.
		expect(state.resolvedWith).toBeNull();
	});

	it("resolves the context from the session when one exists", async () => {
		state.session = {
			session: { activeOrganizationId: "org-1", id: "session-1" },
			user: { id: "user-1", role: "user" },
		};

		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`);
			expect(response.status).toBe(200);
			const body = (await response.json()) as OrganizationContext;
			expect(body.isAuthenticated).toBe(true);
			expect(body.userId).toBe("user-1");
		});
		expect(state.resolvedWith).toEqual({
			session: { activeOrganizationId: "org-1", id: "session-1" },
			user: { id: "user-1", role: "user" },
		});
	});
});
