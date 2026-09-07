import type { OrganizationContext } from "../../types/organization-context.js";
import type { RouteTestSession } from "./route-auth-mocks.js";

/**
 * Mutable harness state shared by route tests. Import **this** module (never
 * the mock registrar) when a test needs to change who is calling.
 *
 * Feature routers add their handler doubles here: give `@brnit/api` a
 * `mock.module` factory whose handlers read from a `handlers` field on this
 * object, so a test can swap one handler without re-registering the mock.
 */
export const apiRouteMocks: {
	memberId: string | null;
	organizationContext: OrganizationContext | null;
	session: RouteTestSession;
} = {
	memberId: null,
	organizationContext: null,
	session: null,
};

/** Restore harness state between tests. Call from `afterEach`. */
export function resetApiRouteMocks(): void {
	apiRouteMocks.memberId = null;
	apiRouteMocks.organizationContext = null;
	apiRouteMocks.session = null;
}
