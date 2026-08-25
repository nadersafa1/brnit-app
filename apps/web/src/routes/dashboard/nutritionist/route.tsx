import { createFileRoute, Outlet } from "@tanstack/react-router";

import { canAccessNutritionistSection } from "@/lib/authorization/dashboard-access";
import { requireSectionAccess } from "@/lib/route-guards";

/**
 * Was `app/dashboard/nutritionist/layout.tsx` (the `DashboardSegmentGate`).
 *
 * Mirrors the server's `requireNutritionist`: an app admin, a global app-role
 * nutritionist, or an org-role nutritionist with an active organization.
 */
export const Route = createFileRoute("/dashboard/nutritionist")({
	beforeLoad: ({ context, location }) =>
		requireSectionAccess(
			context.queryClient,
			location.href,
			canAccessNutritionistSection
		),
	component: Outlet,
});
