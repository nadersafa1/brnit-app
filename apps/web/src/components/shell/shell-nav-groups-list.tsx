import type { LucideIcon } from "lucide-react";

import { ShellNavGroup } from "@/components/shell/shell-nav-group";
import { ShellNavLinkItem } from "@/components/shell/shell-nav-link-item";

export interface ShellNavLink {
	icon: LucideIcon;
	label: string;
	to: string;
}

export interface ShellNavGroupConfig {
	id: string;
	label: string;
	links: readonly ShellNavLink[];
}

interface ShellNavGroupsListProps {
	groups: readonly ShellNavGroupConfig[];
	isActive: (to: string) => boolean;
	onNavigate?: () => void;
}

/**
 * Renders the resolved nav configuration. Which groups exist is a permissions
 * question answered once in `dashboard-nav-groups.ts`; this component only
 * draws what it is handed.
 */
export function ShellNavGroupsList({
	groups,
	isActive,
	onNavigate,
}: Readonly<ShellNavGroupsListProps>) {
	return (
		<>
			{groups.map((group, index) => (
				<ShellNavGroup
					id={group.id}
					isFirst={index === 0}
					key={group.id}
					label={group.label}
				>
					{group.links.map((link) => (
						<ShellNavLinkItem
							active={isActive(link.to)}
							icon={link.icon}
							key={link.to}
							label={link.label}
							onNavigate={onNavigate}
							to={link.to}
						/>
					))}
				</ShellNavGroup>
			))}
		</>
	);
}
