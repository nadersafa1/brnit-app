import { createFileRoute, Outlet } from "@tanstack/react-router";

import { canAccessDirectAdminSection } from "@/lib/authorization/dashboard-access";
import { assertSectionAccess } from "@/lib/route-guards";

/**
 * Was `app/dashboard/direct-admin/layout.tsx` (the `DashboardSegmentGate`).
 *
 * Mirrors the server's `requireAssessmentWriteAuth`: app admin, org owner or
 * direct admin, and — for everyone but the app admin — an active organization
 * to scope the writes to.
 */
export const Route = createFileRoute("/dashboard/direct-admin")({
	beforeLoad: ({ context }) => {
		assertSectionAccess(context, canAccessDirectAdminSection);
	},
	component: Outlet,
});
