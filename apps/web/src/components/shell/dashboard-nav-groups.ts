import type { OrganizationContextDto } from "@brnit/api";
import {
	ActivityIcon,
	Building2Icon,
	CalendarRangeIcon,
	LayoutDashboardIcon,
	SaladIcon,
	TagsIcon,
	UsersIcon,
	UtensilsCrossedIcon,
} from "lucide-react";

import type { ShellNavGroupConfig } from "@/components/shell/shell-nav-groups-list";
import {
	canAccessAdminSection,
	canAccessDirectAdminSection,
	canAccessNutritionistSection,
} from "@/lib/authorization/dashboard-access";

/**
 * The sidebar, per `docs/migration/api-surface.md` §10:
 *
 * > Sidebar shows Dashboard + Organizations always; the Admin group when
 * > `user.role === 'admin'`; Direct Admin and Nutritionist groups by their
 * > respective access predicates.
 *
 * Visibility is a **navigation** decision only. Each destination is also gated
 * server-side and by a `beforeLoad` on its route group, so hiding a group here
 * never stands in for a guard.
 */

const workspaceGroup: ShellNavGroupConfig = {
	id: "nav-workspace",
	label: "Workspace",
	links: [
		{ icon: LayoutDashboardIcon, label: "Dashboard", to: "/dashboard" },
		{
			icon: Building2Icon,
			label: "Organizations",
			to: "/dashboard/organizations",
		},
	],
};

const adminGroup: ShellNavGroupConfig = {
	id: "nav-admin",
	label: "Admin",
	links: [
		{ icon: UsersIcon, label: "Users", to: "/dashboard/admin" },
		{ icon: TagsIcon, label: "Categories", to: "/dashboard/admin/categories" },
		{
			icon: UtensilsCrossedIcon,
			label: "Food items",
			to: "/dashboard/admin/food-items",
		},
		{ icon: SaladIcon, label: "Meals", to: "/dashboard/admin/meals" },
		{
			icon: CalendarRangeIcon,
			label: "Diet plans",
			to: "/dashboard/admin/diet-plans",
		},
	],
};

const directAdminGroup: ShellNavGroupConfig = {
	id: "nav-direct-admin",
	label: "Direct admin",
	links: [
		{
			icon: ActivityIcon,
			label: "Members",
			to: "/dashboard/direct-admin/members",
		},
	],
};

const nutritionistGroup: ShellNavGroupConfig = {
	id: "nav-nutritionist",
	label: "Nutritionist",
	links: [
		{
			icon: TagsIcon,
			label: "Categories",
			to: "/dashboard/nutritionist/categories",
		},
		{
			icon: UtensilsCrossedIcon,
			label: "Food items",
			to: "/dashboard/nutritionist/food-items",
		},
		{ icon: SaladIcon, label: "Meals", to: "/dashboard/nutritionist/meals" },
		{
			icon: CalendarRangeIcon,
			label: "Diet plans",
			to: "/dashboard/nutritionist/diet-plans",
		},
	],
};

export function resolveDashboardNavGroups(
	appRole: string | null | undefined,
	context: OrganizationContextDto
): readonly ShellNavGroupConfig[] {
	const groups: ShellNavGroupConfig[] = [workspaceGroup];
	if (canAccessAdminSection(appRole)) {
		groups.push(adminGroup);
	}
	if (canAccessDirectAdminSection(appRole, context)) {
		groups.push(directAdminGroup);
	}
	if (canAccessNutritionistSection(appRole, context)) {
		groups.push(nutritionistGroup);
	}
	return groups;
}

/**
 * Longest-prefix match, so exactly one link is ever highlighted.
 *
 * A flag-free rule is what makes this safe as the tree grows: `/dashboard` is a
 * prefix of every other destination and `/dashboard/admin` is a prefix of the
 * admin children, but the deepest matching link always wins.
 */
export function resolveActiveNavPath(
	groups: readonly ShellNavGroupConfig[],
	pathname: string
): string | null {
	let best: string | null = null;
	for (const group of groups) {
		for (const link of group.links) {
			const matches =
				pathname === link.to || pathname.startsWith(`${link.to}/`);
			if (matches && (best === null || link.to.length > best.length)) {
				best = link.to;
			}
		}
	}
	return best;
}
