import { createFileRoute, Outlet } from "@tanstack/react-router";

import { canAccessAdminSection } from "@/lib/authorization/dashboard-access";
import { requireSectionAccess } from "@/lib/route-guards";

/**
 * Was `app/dashboard/admin/layout.tsx` (`user.role === 'admin'`).
 *
 * The layout is the parent `/dashboard` shell — this route only contributes the
 * gate, so the sidebar and top bar are not rebuilt per section.
 */
export const Route = createFileRoute("/dashboard/admin")({
	beforeLoad: ({ context, location }) =>
		requireSectionAccess(context.queryClient, location.href, (appRole) =>
			canAccessAdminSection(appRole)
		),
	component: Outlet,
});
