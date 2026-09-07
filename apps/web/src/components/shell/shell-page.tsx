import { cn } from "@brnit/ui/lib/utils";
import type { ReactNode } from "react";

import {
	SHELL_PAGE_WIDTH_CLASS,
	type ShellPageWidth,
} from "@/components/shell/shell-page-width";

interface ShellPageProps {
	children: ReactNode;
	className?: string;
	/** Drops the default gap between sections (full-height layouts own their spacing). */
	disableSectionSpacing?: boolean;
	width?: ShellPageWidth;
}

/**
 * The root of every dashboard screen: a width class and the vertical rhythm
 * between sections.
 *
 * It deliberately applies **no padding** — `AppSidebarShell` owns that on
 * `<main>`. A page that adds its own ends up with double gutters that only show
 * up on small screens.
 */
export function ShellPage({
	children,
	className,
	disableSectionSpacing = false,
	width = "wide",
}: Readonly<ShellPageProps>) {
	return (
		<div
			className={cn(
				SHELL_PAGE_WIDTH_CLASS[width],
				!disableSectionSpacing && "space-y-6",
				className
			)}
			data-slot="shell-page"
		>
			{children}
		</div>
	);
}
