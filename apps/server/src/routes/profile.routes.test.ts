import "./test-utils/route-test-env.js";

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import express, { type Express } from "express";

import { installRouteAuthMiddlewareMock } from "./route-test-auth-mock.js";
import {
	apiRouteMocks,
	resetApiRouteMocks,
} from "./test-utils/route-api-mock-state.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * `/me/profile` wiring: the session guard, multipart parsing, and the two
 * validation failures that never reach better-auth.
 */

const updateUserCalls: unknown[] = [];

mock.module("@brnit/auth", () => ({
	auth: {
		api: {
			getSession: () => Promise.resolve(apiRouteMocks.session),
			updateUser: (payload: unknown) => {
				updateUserCalls.push(payload);
				return Promise.resolve({ status: true });
			},
		},
	},
}));

installRouteAuthMiddlewareMock();

const { createProfileRouter } = await import("./profile.routes.js");

const PATH = "/api/v1/me/profile";

async function withServer(
	assert: (baseUrl: string) => Promise<void>
): Promise<void> {
	const app: Express = express();
	app.use("/api/v1", createProfileRouter());
	const server = await startEphemeralServer(app);
	try {
		await assert(server.baseUrl);
	} finally {
		await server.close();
	}
}

beforeEach(() => {
	updateUserCalls.length = 0;
	apiRouteMocks.session = {
		session: { activeOrganizationId: null, id: "session-1" },
		user: { id: "user-1", role: "user" },
	};
});

afterEach(() => {
	resetApiRouteMocks();
});

describe("/me/profile without a session", () => {
	it("answers 401 on GET", async () => {
		apiRouteMocks.session = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`);
			expect(response.status).toBe(401);
		});
	});

	it("answers 401 on PATCH", async () => {
		apiRouteMocks.session = null;
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`, { method: "PATCH" });
			expect(response.status).toBe(401);
		});
	});
});

describe("PATCH /me/profile", () => {
	it("rejects a request that changes nothing", async () => {
		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`, { method: "PATCH" });
			expect(response.status).toBe(400);
			const body = (await response.json()) as { error: string };
			expect(body.error).toBe(
				"At least one of name, dob, image file, or clearImage must be provided"
			);
		});
		expect(updateUserCalls).toEqual([]);
	});

	it("rejects a date of birth in the future", async () => {
		const form = new FormData();
		form.set("dob", "2999-01-01");

		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`, {
				body: form,
				method: "PATCH",
			});
			expect(response.status).toBe(400);
			const body = (await response.json()) as {
				details: { fieldErrors: Record<string, string[]> };
				error: string;
			};
			expect(body.error).toBe("Invalid form fields");
			expect(body.details.fieldErrors.dob).toContain(
				"Date of birth must be a valid past date"
			);
		});
		expect(updateUserCalls).toEqual([]);
	});

	it("rejects a malformed date of birth", async () => {
		const form = new FormData();
		form.set("dob", "01-01-1990");

		await withServer(async (baseUrl) => {
			const response = await fetch(`${baseUrl}${PATH}`, {
				body: form,
				method: "PATCH",
			});
			expect(response.status).toBe(400);
		});
	});
});
