import "./test-utils/route-test-env.js";

import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { createContextFromRequest } from "@brnit/api/context";
import { HttpError } from "@brnit/api/http-error";
import { queryParam } from "@brnit/api/pagination/query-params";
// biome-ignore lint/performance/noNamespaceImport: the mock must re-export every input schema the controller imports
import * as versionGateSchemas from "@brnit/api/version-gate/schemas";
import express from "express";

import { installRouteAuthMiddlewareMock } from "./route-test-auth-mock.js";
import {
	apiRouteMocks,
	resetApiRouteMocks,
} from "./test-utils/route-api-mock-state.js";
import { startEphemeralServer } from "./test-utils/route-test-http.js";

/**
 * Route integration test for the version-gate router: a real Express app on an
 * ephemeral port, driven with `fetch`.
 *
 * The guards and the `@brnit/api` handlers are doubles; **the schemas are the
 * real ones**, so this covers what the controller and router are actually
 * responsible for — query and body validation, status mapping, and above all
 * the guard split: `/app-version` must stay reachable with no session, while
 * both admin routes must not.
 */

type HandlerDouble = (...args: unknown[]) => Promise<unknown>;

const NO_GATE = {
	action: "none",
	latestVersion: "",
	message: "",
	storeUrl: "",
};

const EMPTY_ADMIN_GATE = { android: null, ios: null };

const VALID_CONFIG = {
	latestVersion: "2.1.0",
	message: "Update to keep logging meals.",
	minVersion: "2.0.0",
	storeUrl: "https://apps.apple.com/app/id123456789",
};

const handlers: Record<string, HandlerDouble> = {};

function resetHandlers(): void {
	handlers.getAppVersion = () => Promise.resolve(NO_GATE);
	handlers.getAdminVersionGate = () => Promise.resolve(EMPTY_ADMIN_GATE);
	handlers.putAdminVersionGate = () => Promise.resolve(EMPTY_ADMIN_GATE);
}

resetHandlers();

/** Forwards to whatever double the current test installed. */
function delegate(name: string): HandlerDouble {
	return (...args: unknown[]) => {
		const handler = handlers[name];
		if (!handler) {
			throw new Error(`no handler double registered for ${name}`);
		}
		return handler(...args);
	};
}

installRouteAuthMiddlewareMock();

mock.module("@brnit/api", () => ({
	...versionGateSchemas,
	HttpError,
	createContextFromRequest,
	queryParam,
	getAdminVersionGate: delegate("getAdminVersionGate"),
	getAppVersion: delegate("getAppVersion"),
	putAdminVersionGate: delegate("putAdminVersionGate"),
}));

const { createVersionGateRouter } = await import("./version-gate.routes.js");

const app = express();
app.use(express.json());
app.use("/api/v1", createVersionGateRouter());

const server = await startEphemeralServer(app);

afterAll(async () => {
	await server.close();
});

beforeEach(() => {
	resetApiRouteMocks();
	resetHandlers();
});

function signIn(role: string | null): void {
	apiRouteMocks.session = {
		session: { activeOrganizationId: null, id: "session-1" },
		user: { id: "user-1", role },
	};
}

async function get(path: string): Promise<{ body: unknown; status: number }> {
	const response = await fetch(`${server.baseUrl}${path}`);
	return { body: await response.json(), status: response.status };
}

async function put(
	path: string,
	body: unknown
): Promise<{ body: unknown; status: number }> {
	const response = await fetch(`${server.baseUrl}${path}`, {
		body: JSON.stringify(body),
		headers: { "content-type": "application/json" },
		method: "PUT",
	});
	return { body: await response.json(), status: response.status };
}

const APP_VERSION_PATH = "/api/v1/app-version";
const ADMIN_PATH = "/api/v1/admin/version-gate";

describe("GET /app-version", () => {
	it("serves an anonymous caller — the route is deliberately public", async () => {
		handlers.getAppVersion = () =>
			Promise.resolve({
				action: "block",
				latestVersion: "2.1.0",
				message: "Please update.",
				storeUrl: "https://apps.apple.com/app/id123456789",
			});

		const { body, status } = await get(
			`${APP_VERSION_PATH}?platform=ios&version=1.0.0`
		);

		expect(status).toBe(200);
		expect(body).toMatchObject({ action: "block", message: "Please update." });
	});

	it("answers 400 when platform is missing", async () => {
		const { body, status } = await get(`${APP_VERSION_PATH}?version=1.0.0`);

		expect(status).toBe(400);
		expect(body).toMatchObject({ error: "Invalid query parameters" });
	});

	it("answers 400 when version is missing", async () => {
		const { status } = await get(`${APP_VERSION_PATH}?platform=ios`);

		expect(status).toBe(400);
	});

	it("answers 400 for a platform outside the enum", async () => {
		const { status } = await get(
			`${APP_VERSION_PATH}?platform=web&version=1.0.0`
		);

		expect(status).toBe(400);
	});

	it("passes the parsed query through to the handler", async () => {
		let received: unknown;
		handlers.getAppVersion = (query: unknown) => {
			received = query;
			return Promise.resolve(NO_GATE);
		};

		await get(`${APP_VERSION_PATH}?platform=android&version=3.2.1`);

		expect(received).toEqual({ platform: "android", version: "3.2.1" });
	});
});

describe("GET /admin/version-gate", () => {
	it("answers 401 when there is no session", async () => {
		const { status } = await get(ADMIN_PATH);

		expect(status).toBe(401);
	});

	it("answers 401 for a signed-in non-admin", async () => {
		signIn("nutritionist");

		const { status } = await get(ADMIN_PATH);

		expect(status).toBe(401);
	});

	it("serves both platforms to an app admin", async () => {
		signIn("admin");
		handlers.getAdminVersionGate = () =>
			Promise.resolve({ android: null, ios: VALID_CONFIG });

		const { body, status } = await get(ADMIN_PATH);

		expect(status).toBe(200);
		expect(body).toEqual({ android: null, ios: VALID_CONFIG });
	});
});

describe("PUT /admin/version-gate", () => {
	it("answers 401 for a signed-in non-admin", async () => {
		signIn("user");

		const { status } = await put(ADMIN_PATH, { ios: VALID_CONFIG });

		expect(status).toBe(401);
	});

	it("answers 400 when storeUrl is not a URL", async () => {
		signIn("admin");

		const { body, status } = await put(ADMIN_PATH, {
			ios: { ...VALID_CONFIG, storeUrl: "not-a-url" },
		});

		expect(status).toBe(400);
		expect(body).toMatchObject({ error: "Invalid request body" });
	});

	/**
	 * The cross-field issue is raised at `["minVersion"]` *within* the platform
	 * schema, so the body-level path is `["ios", "minVersion"]`. `flattenError`
	 * keys only by the first segment — the envelope therefore reports it under
	 * `ios`, and a per-platform form has to read the message, not the key.
	 */
	it("answers 400 when minVersion is above latestVersion", async () => {
		signIn("admin");

		const { body, status } = await put(ADMIN_PATH, {
			ios: { ...VALID_CONFIG, latestVersion: "1.9.0", minVersion: "2.0.0" },
		});

		expect(status).toBe(400);
		expect(body).toMatchObject({
			details: {
				fieldErrors: {
					ios: ["minVersion must not be greater than latestVersion"],
				},
			},
		});
	});

	it("passes the parsed body through and returns the saved gate", async () => {
		signIn("admin");
		let received: unknown;
		handlers.putAdminVersionGate = (_ctx: unknown, input: unknown) => {
			received = input;
			return Promise.resolve({ android: null, ios: VALID_CONFIG });
		};

		const { body, status } = await put(ADMIN_PATH, { ios: VALID_CONFIG });

		expect(status).toBe(200);
		expect(received).toEqual({ ios: VALID_CONFIG });
		expect(body).toEqual({ android: null, ios: VALID_CONFIG });
	});

	it("accepts an empty body as a no-op rather than rejecting it", async () => {
		signIn("admin");

		const { status } = await put(ADMIN_PATH, {});

		expect(status).toBe(200);
	});

	it("surfaces a handler HttpError with its own status", async () => {
		signIn("admin");
		handlers.putAdminVersionGate = () =>
			Promise.reject(new HttpError(401, "Unauthorized"));

		const { body, status } = await put(ADMIN_PATH, { ios: VALID_CONFIG });

		expect(status).toBe(401);
		expect(body).toEqual({ error: "Unauthorized" });
	});
});
