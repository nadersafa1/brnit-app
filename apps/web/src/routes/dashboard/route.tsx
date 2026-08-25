import { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api/organization/context";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { useMemo } from "react";

import { AppSidebarShell } from "@/components/shell/app-sidebar-shell";
import {
	resolveActiveNavPath,
	resolveDashboardNavGroups,
} from "@/components/shell/dashboard-nav-groups";
import { ShellNavGroupsList } from "@/components/shell/shell-nav-groups-list";
import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { authClient } from "@/lib/auth-client";
import {
	loadOrganizationContext,
	requireCompletedProfile,
} from "@/lib/route-guards";

/**
 * Was `app/dashboard/layout.tsx`.
 *
 * The gate runs in `beforeLoad`, so a signed-out visitor never renders a frame
 * of the shell. The organization context is prefetched in the same pass — the
 * sidebar needs it to decide which groups exist, and fetching it here means it
 * is already in cache when the layout mounts instead of popping in a beat later.
 */
export const Route = createFileRoute("/dashboard")({
	// The return value is merged into the context of every route below this one,
	// so the section gates can check a role without a second session round-trip.
	beforeLoad: async ({ context, location }) => {
		const session = await requireCompletedProfile(location.href);
		const organizationContext = await loadOrganizationContext(
			context.queryClient
		);
		return { organizationContext, session };
	},
	component: DashboardLayout,
});

function DashboardLayout() {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});
	const { data: session } = authClient.useSession();
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);

	const appRole = session?.user.role;
	const navGroups = useMemo(
		() =>
			resolveDashboardNavGroups(
				appRole,
				organizationContext ?? ANONYMOUS_ORGANIZATION_CONTEXT
			),
		[appRole, organizationContext]
	);

	const activePath = resolveActiveNavPath(navGroups, pathname);
	const activeLabel = navGroups
		.flatMap((group) => group.links)
		.find((link) => link.to === activePath)?.label;

	return (
		<AppSidebarShell
			ariaLabel="Dashboard"
			mainId="dashboard-main"
			navLinks={({ onNavigate }) => (
				<ShellNavGroupsList
					groups={navGroups}
					isActive={(to) => to === activePath}
					onNavigate={onNavigate}
				/>
			)}
			topBarSubtitle={organizationContext?.organization?.name}
			topBarTitle={activeLabel ?? "Dashboard"}
		>
			<Outlet />
		</AppSidebarShell>
	);
}
