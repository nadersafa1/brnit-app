import { ANONYMOUS_ORGANIZATION_CONTEXT } from "@brnit/api/organization/context";
import { Card, CardContent } from "@brnit/ui/components/card";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ActivityIcon,
	Building2Icon,
	type LucideIcon,
	UserCogIcon,
	UtensilsCrossedIcon,
} from "lucide-react";

import { ShellPage } from "@/components/shell/shell-page";
import { ShellPageHeader } from "@/components/shell/shell-page-header";
import { organizationContextQueryOptions } from "@/lib/api/queries/organization-context";
import { authClient } from "@/lib/auth-client";
import {
	canAccessAdminSection,
	canAccessDirectAdminSection,
	canAccessNutritionistSection,
} from "@/lib/authorization/dashboard-access";

const WHITESPACE_RUN = /\s+/;

interface DashboardShortcut {
	description: string;
	icon: LucideIcon;
	label: string;
	to: string;
}

const ORGANIZATIONS_SHORTCUT: DashboardShortcut = {
	description: "Members, invitations and roles for the orgs you belong to.",
	icon: Building2Icon,
	label: "Organizations",
	to: "/dashboard/organizations",
};

const ADMIN_SHORTCUT: DashboardShortcut = {
	description: "Users, the food catalog, meals and diet plan templates.",
	icon: UserCogIcon,
	label: "Admin",
	to: "/dashboard/admin",
};

const NUTRITIONIST_SHORTCUT: DashboardShortcut = {
	description: "Build meals and diet plans, and assign them to members.",
	icon: UtensilsCrossedIcon,
	label: "Nutritionist",
	to: "/dashboard/nutritionist/categories",
};

const DIRECT_ADMIN_SHORTCUT: DashboardShortcut = {
	description: "Record body-composition assessments for your members.",
	icon: ActivityIcon,
	label: "Direct admin",
	to: "/dashboard/direct-admin/members",
};

function ShortcutCard({ shortcut }: Readonly<{ shortcut: DashboardShortcut }>) {
	const Icon = shortcut.icon;
	return (
		<Link
			className="group/shortcut cursor-pointer rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-brand-accent"
			to={shortcut.to}
		>
			<Card className="h-full transition-shadow duration-(--default-transition-duration) ease-standard group-hover/shortcut:shadow-float">
				<CardContent className="flex h-full flex-col gap-2 p-5">
					<span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft">
						<Icon aria-hidden className="size-5 text-accent-fg" />
					</span>
					<p className="font-semibold text-base">{shortcut.label}</p>
					<p className="text-muted-foreground text-sm">
						{shortcut.description}
					</p>
				</CardContent>
			</Card>
		</Link>
	);
}

/**
 * The signed-in landing screen: a greeting plus the sections this user can
 * actually reach. The visibility rules are the same predicates the sidebar and
 * the route guards use, so the three can never disagree.
 */
export function DashboardPage() {
	const { data: session } = authClient.useSession();
	const { data: organizationContext } = useQuery(
		organizationContextQueryOptions()
	);
	const context = organizationContext ?? ANONYMOUS_ORGANIZATION_CONTEXT;
	const appRole = session?.user.role;

	const shortcuts: DashboardShortcut[] = [ORGANIZATIONS_SHORTCUT];
	if (canAccessAdminSection(appRole)) {
		shortcuts.push(ADMIN_SHORTCUT);
	}
	if (canAccessNutritionistSection(appRole, context)) {
		shortcuts.push(NUTRITIONIST_SHORTCUT);
	}
	if (canAccessDirectAdminSection(appRole, context)) {
		shortcuts.push(DIRECT_ADMIN_SHORTCUT);
	}

	const firstName = session?.user.name?.trim().split(WHITESPACE_RUN).at(0);

	return (
		<ShellPage>
			<ShellPageHeader
				description="Pick up where you left off, or jump into one of your sections."
				eyebrow={context.organization?.name}
				title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
			/>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{shortcuts.map((shortcut) => (
					<ShortcutCard key={shortcut.to} shortcut={shortcut} />
				))}
			</div>
		</ShellPage>
	);
}
