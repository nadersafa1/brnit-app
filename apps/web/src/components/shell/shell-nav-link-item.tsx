import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

import {
	shellNavLinkClassName,
	shellNavLinkIconClassName,
} from "@/lib/shell-nav-link";

interface ShellNavLinkItemProps {
	active: boolean;
	icon: LucideIcon;
	label: string;
	/** Closes the mobile sheet after navigating. Absent on desktop. */
	onNavigate?: () => void;
	to: string;
}

export function ShellNavLinkItem({
	active,
	icon: Icon,
	label,
	onNavigate,
	to,
}: Readonly<ShellNavLinkItemProps>) {
	return (
		<Link
			aria-current={active ? "page" : undefined}
			className={shellNavLinkClassName(active)}
			onClick={onNavigate}
			to={to}
		>
			<Icon aria-hidden className={shellNavLinkIconClassName(active)} />
			<span className="min-w-0 flex-1 truncate">{label}</span>
		</Link>
	);
}
