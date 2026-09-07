import type { OrganizationContextDto } from "@brnit/api";
import { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api/organization/context";
import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { authClient, type Session } from "@/lib/auth-client";

/**
 * The gates the Next.js server components used to run, moved into route
 * `beforeLoad`.
 *
 * They run **before** the route's component or loader, so a signed-out visitor
 * never renders a frame of a protected screen. Each one throws `redirect(...)`;
 * throwing (rather than `redirect({ throw: true })` plus a bare `return`) is
 * what lets TypeScript narrow the session as non-null for the caller.
 */

/**
 * Any valid session. Sends the visitor to `/login` carrying where they were
 * headed, so sign-in resumes the navigation instead of dumping them on the
 * dashboard.
 */
export async function requireSession(redirectTo: string): Promise<Session> {
	const { data } = await authClient.getSession();
	if (!(data?.user && data.session)) {
		throw redirect({ to: "/login", search: { redirect: redirectTo } });
	}
	return data;
}

/**
 * A session **and** a completed profile.
 *
 * `dob` is the one field sign-up cannot collect (OAuth never provides it) and
 * every diet-plan screen assumes it exists, so the dashboard is gated on it.
 * Was `app/dashboard/layout.tsx`.
 */
export async function requireCompletedProfile(
	redirectTo: string
): Promise<Session> {
	const session = await requireSession(redirectTo);
	if (!session.user.dob) {
		throw redirect({
			to: "/complete-profile",
			search: { redirect: redirectTo },
		});
	}
	return session;
}

/** The organization scope, fetched once per session and shared with the sidebar. */
export function loadOrganizationContext(
	queryClient: QueryClient
): Promise<OrganizationContextDto> {
	return queryClient
		.ensureQueryData(organizationContextQueryOptions())
		.catch(() => ANONYMOUS_ORGANIZATION_CONTEXT);
}

/** What `/dashboard`'s `beforeLoad` adds to the context of every route beneath it. */
export interface DashboardRouteContext {
	organizationContext: OrganizationContextDto;
	session: Session;
}

/**
 * A section gate.
 *
 * Reads the session and organization scope out of the **parent** context rather
 * than fetching again: `/dashboard`'s `beforeLoad` has already resolved both by
 * the time this runs, and re-fetching would put a second session round-trip on
 * every admin navigation.
 *
 * A failure lands on the dashboard rather than an "access denied" screen,
 * because the sidebar only ever offers a section the same predicate allows —
 * getting here means a stale link or a role that changed mid-session.
 */
export function assertSectionAccess(
	context: DashboardRouteContext,
	predicate: (
		appRole: string | null | undefined,
		organizationContext: OrganizationContextDto
	) => boolean
): void {
	if (!predicate(context.session.user.role, context.organizationContext)) {
		throw redirect({ to: "/dashboard" });
	}
}
