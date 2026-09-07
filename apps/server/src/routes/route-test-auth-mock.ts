import { mock } from "bun:test";

import { apiRouteMocks } from "./test-utils/route-api-mock-state.js";
import { createRouteAuthMiddlewareMocks } from "./test-utils/route-auth-mocks.js";

/**
 * Replaces the real guards for route integration tests.
 *
 * The specifier must be the one route modules themselves use
 * (`../middlewares/auth-middleware.js`) — Bun resolves it relative to this
 * file, and this file sits next to the route modules for exactly that reason.
 *
 * Call before the dynamic `await import()` of the router under test, so the
 * mock is registered by the time the module graph loads.
 */
export function installRouteAuthMiddlewareMock(): void {
	mock.module("../middlewares/auth-middleware.js", () =>
		createRouteAuthMiddlewareMocks({
			getMemberId: () => apiRouteMocks.memberId,
			getOrganizationContext: () => apiRouteMocks.organizationContext,
			getSession: () => apiRouteMocks.session,
		})
	);
}
